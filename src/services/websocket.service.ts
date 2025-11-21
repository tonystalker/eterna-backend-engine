import { WebSocket } from '@fastify/websocket';
import { getRedisPubClient, getRedisSubClient } from '../config/redis.config';
import { OrderStatusUpdate } from '../models/types';
import { logger } from '../utils/logger';
import { REDIS_KEYS, WS_EVENTS } from '../utils/constants';

// WebSocket ready states (since @fastify/websocket doesn't export these constants)
const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

/**
 * WebSocket Service
 * Manages WebSocket connections and broadcasts order status updates via Redis pub/sub
 * This allows horizontal scaling across multiple server instances
 */
export class WebSocketService {
  private connections: Map<string, WebSocket> = new Map();
  private pubClient = getRedisPubClient();
  private subClient = getRedisSubClient();
  private subscriptions: Set<string> = new Set();

  constructor() {
    this.setupSubscriptionHandler();
    logger.info('WebSocket service initialized');
  }

  /**
   * Register a WebSocket connection for an order
   */
  registerConnection(orderId: string, socket: WebSocket): void {
    // Store connection
    this.connections.set(orderId, socket);

    // Subscribe to order-specific channel
    const channel = REDIS_KEYS.ORDER_CHANNEL(orderId);
    if (!this.subscriptions.has(channel)) {
      this.subClient.subscribe(channel, (err) => {
        if (err) {
          logger.error({ err, channel }, 'Failed to subscribe to channel');
        } else {
          this.subscriptions.add(channel);
          logger.debug({ channel }, 'Subscribed to order channel');
        }
      });
    }

    // Send connection established event
    this.sendToSocket(socket, {
      event: WS_EVENTS.CONNECTION_ESTABLISHED,
      orderId,
      timestamp: new Date(),
    });

    // Handle socket close
    socket.on('close', () => {
      this.unregisterConnection(orderId);
    });

    // Handle socket errors
    socket.on('error', (error: Error) => {
      logger.error({ error: error.message, orderId }, 'WebSocket error');
      this.unregisterConnection(orderId);
    });

    logger.info({ orderId }, 'WebSocket connection registered');
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterConnection(orderId: string): void {
    this.connections.delete(orderId);

    // Unsubscribe from channel if no more connections
    const channel = REDIS_KEYS.ORDER_CHANNEL(orderId);
    if (this.subscriptions.has(channel)) {
      this.subClient.unsubscribe(channel, (err) => {
        if (err) {
          logger.error({ err, channel }, 'Failed to unsubscribe from channel');
        } else {
          this.subscriptions.delete(channel);
          logger.debug({ channel }, 'Unsubscribed from order channel');
        }
      });
    }

    logger.debug({ orderId }, 'WebSocket connection unregistered');
  }

  /**
   * Publish status update to Redis (will be received by all instances)
   */
  async publishStatusUpdate(update: OrderStatusUpdate): Promise<void> {
    try {
      const channel = REDIS_KEYS.ORDER_CHANNEL(update.orderId);
      const message = JSON.stringify(update);

      await this.pubClient.publish(channel, message);

      logger.debug(
        {
          orderId: update.orderId,
          status: update.status,
          channel,
        },
        'Status update published to Redis'
      );
    } catch (error) {
      logger.error({ error, update }, 'Failed to publish status update');
      throw error;
    }
  }

  /**
   * Setup handler for incoming Redis pub/sub messages
   */
  private setupSubscriptionHandler(): void {
    this.subClient.on('message', (channel: string, message: string) => {
      try {
        const update: OrderStatusUpdate = JSON.parse(message);
        const socket = this.connections.get(update.orderId);

        if (socket && socket.readyState === WS_READY_STATE.OPEN) {
          this.sendToSocket(socket, {
            event: WS_EVENTS.ORDER_UPDATE,
            ...update,
          });

          logger.debug(
            {
              orderId: update.orderId,
              status: update.status,
            },
            'Status update sent to WebSocket client'
          );
        } else {
          logger.debug(
            {
              orderId: update.orderId,
              status: update.status,
              hasSocket: !!socket,
              socketState: socket?.readyState,
            },
            'No active WebSocket connection for order'
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(
          {
            error: errorMessage,
            stack: errorStack,
            channel,
            message,
          },
          'Failed to process Redis message'
        );
      }
    });

    this.subClient.on('error', (error) => {
      logger.error({ error }, 'Redis subscriber error');
    });
  }

  /**
   * Send message to WebSocket client
   */
  private sendToSocket(socket: WebSocket, data: unknown): void {
    try {
      if (socket.readyState === WS_READY_STATE.OPEN) {
        socket.send(JSON.stringify(data));
      } else {
        logger.debug(
          { socketState: socket.readyState },
          'Socket not in OPEN state, skipping send'
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage, data }, 'Failed to send WebSocket message');
    }
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const [orderId, socket] of this.connections) {
      socket.close();
      this.unregisterConnection(orderId);
    }

    logger.info('All WebSocket connections closed');
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
