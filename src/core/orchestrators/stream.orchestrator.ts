import { WebSocket } from '@fastify/websocket';
import { getRedisConnection } from '../infrastructure/config/redis.config';
import { createLogger } from '../infrastructure/logging/system.logger';

const logger = createLogger('STREAM_ORCHESTRATOR');

const STREAM_CHANNEL = 'transaction-updates';
const SYSTEM_CHANNEL = 'system-events';

interface ClientConnection {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>;
  correlationId?: string;
  connectedAt: Date;
}

const activeConnections = new Map<string, ClientConnection>();
let redisSubscriber: any = null;
let redisPublisher: any = null;

export async function initializeStreaming(): Promise<void> {
  logger.info('Initializing streaming infrastructure');

  const redis = getRedisConnection();

  redisSubscriber = redis.duplicate();
  redisPublisher = redis.duplicate();

  await Promise.all([
    redisSubscriber.connect(),
    redisPublisher.connect(),
  ]);

  await redisSubscriber.subscribe(STREAM_CHANNEL);
  await redisSubscriber.subscribe(SYSTEM_CHANNEL);

  redisSubscriber.on('message', (channel: string, message: string) => {
    try {
      const data = JSON.parse(message);
      
      logger.debug('Received update from Redis', {
        channel,
        messageType: data.type,
        targetConnections: data.targetConnections || 'all',
      });

      // Broadcast to relevant clients
      broadcastToClients(channel, data);
    } catch (parseError) {
      logger.error('Failed to parse Redis message', {
        channel,
        message: message.substring(0, 100),
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
    }
  });

  logger.info('Streaming infrastructure initialized');
}

export function register(connection: WebSocket, correlationId?: string): string {
  const connectionId = generateConnectionId();
  
  const clientConnection: ClientConnection = {
    id: connectionId,
    socket: connection,
    subscriptions: new Set(['transactions']),
    correlationId,
    connectedAt: new Date(),
  };

  activeConnections.set(connectionId, clientConnection);

  logger.info('WebSocket client registered', {
    connectionId,
    correlationId,
    totalConnections: activeConnections.size,
  });

  if (!redisSubscriber) {
    initializeStreaming().catch((error) => {
      logger.fatal('Failed to initialize streaming', { error });
    });
  }

  return connectionId;
}

export function unregister(connectionId: string): void {
  const connection = activeConnections.get(connectionId);
  
  if (connection) {
    activeConnections.delete(connectionId);
    
    logger.info('WebSocket client unregistered', {
      connectionId,
      totalConnections: activeConnections.size,
      connectionDuration: Date.now() - connection.connectedAt.getTime(),
    });
  }
}

export function subscribe(connectionId: string, subscriptionType: string): void {
  const connection = activeConnections.get(connectionId);
  
  if (connection) {
    connection.subscriptions.add(subscriptionType);
    
    logger.debug('Client subscription added', {
      connectionId,
      subscriptionType,
      totalSubscriptions: connection.subscriptions.size,
    });
  }
}

export function unsubscribe(connectionId: string, subscriptionType: string): void {
  const connection = activeConnections.get(connectionId);
  
  if (connection) {
    connection.subscriptions.delete(subscriptionType);
    
    logger.debug('Client subscription removed', {
      connectionId,
      subscriptionType,
      remainingSubscriptions: connection.subscriptions.size,
    });
  }
}

export function sendToClient(connectionId: string, message: any): void {
  const connection = activeConnections.get(connectionId);
  
  if (connection && connection.socket.readyState === connection.socket.OPEN) {
    try {
      connection.socket.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
        connectionId,
      }));
      
      logger.debug('Message sent to client', {
        connectionId,
        messageType: message.type,
      });
    } catch (sendError) {
      logger.error('Failed to send message to client', {
        connectionId,
        error: sendError instanceof Error ? sendError.message : String(sendError),
      });
      unregister(connectionId);
    }
  }
}

export function broadcastTransactionUpdate(transactionId: string, update: any): void {
  if (!redisPublisher) {
    logger.warn('Redis publisher not initialized - skipping broadcast');
    return;
  }

  const message = {
    type: 'TRANSACTION_UPDATE',
    transactionId,
    update,
    timestamp: new Date().toISOString(),
  };

  redisPublisher.publish(STREAM_CHANNEL, JSON.stringify(message));
  
  logger.debug('Transaction update broadcasted', {
    transactionId,
    updateType: update.status,
  });
}

export function broadcastSystemEvent(event: any): void {
  if (!redisPublisher) {
    logger.warn('Redis publisher not initialized - skipping system broadcast');
    return;
  }

  const message = {
    type: 'SYSTEM_EVENT',
    event,
    timestamp: new Date().toISOString(),
  };

  redisPublisher.publish(SYSTEM_CHANNEL, JSON.stringify(message));
  
  logger.debug('System event broadcasted', {
    eventType: event.type,
  });
}

export function getStatistics() {
  return {
    connections: activeConnections.size,
    subscriptions: Array.from(activeConnections.values()).reduce(
      (total, conn) => total + conn.subscriptions.size, 0
    ),
    averageConnectionTime: activeConnections.size > 0 
      ? Array.from(activeConnections.values())
          .reduce((total, conn) => total + (Date.now() - conn.connectedAt.getTime()), 0) / activeConnections.size
      : 0,
  };
}

export async function terminateAll(): Promise<void> {
  logger.info('Terminating all WebSocket connections');

  const closePromises = Array.from(activeConnections.values()).map((connection) => {
    return new Promise<void>((resolve) => {
      if (connection.socket.readyState === connection.socket.OPEN) {
        connection.socket.close();
      }
      resolve();
    });
  });

  await Promise.all(closePromises);
  activeConnections.clear();

  if (redisSubscriber) {
    await redisSubscriber.quit();
    redisSubscriber = null;
  }

  if (redisPublisher) {
    await redisPublisher.quit();
    redisPublisher = null;
  }

  logger.info('All WebSocket connections terminated');
}

function generateConnectionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `conn_${timestamp}_${random}`;
}

function broadcastToClients(channel: string, data: any): void {
  const targetConnections = data.targetConnections || 'all';
  
  for (const [connectionId, connection] of activeConnections.entries()) {
    const shouldReceive = 
      (channel === STREAM_CHANNEL && connection.subscriptions.has('transactions')) ||
      (channel === SYSTEM_CHANNEL && connection.subscriptions.has('system'));

    if (shouldReceive && (targetConnections === 'all' || targetConnections.includes(connectionId))) {
      sendToClient(connectionId, data);
    }
  }
}

export const streamOrchestrator = {
  register,
  unregister,
  subscribe,
  unsubscribe,
  sendToClient,
  broadcastTransactionUpdate,
  broadcastSystemEvent,
  getStatistics,
  terminateAll,
  initialize: initializeStreaming,
};
