import { FastifyRequest, FastifyReply } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { z } from 'zod';
import { createLogger } from '../../../infrastructure/logging/system.logger';
import { pipelineService, streamOrchestrator } from '../../../orchestrators';
import { getDatabaseConnection } from '../../../infrastructure/config/database.config';

const logger = createLogger('TRANSACTION_HANDLER');

const TransactionRequestSchema = z.object({
  tokenIn: z.string().min(1, 'Input token is required'),
  tokenOut: z.string().min(1, 'Output token is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  slippage: z.number().min(0).max(1).optional().default(0.01),
});

const WebSocketMessageSchema = z.object({
  type: z.string(),
  payload: z.any().optional(),
});

export async function execute(request: FastifyRequest, reply: FastifyReply) {
  console.log('🎯 TRANSACTION EXECUTE ENDPOINT HIT!');
  
  const requestLogger = logger.withCorrelation(request.id || 'unknown');
  const startTime = Date.now();
  
  // Log incoming request details
  requestLogger.info('🎯 Transaction execution endpoint hit', {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    contentType: request.headers['content-type'],
    contentLength: request.headers['content-length'],
    clientIP: request.ip,
    timestamp: new Date().toISOString(),
  });
  
  try {
    requestLogger.info('Transaction execution request received');

    const validatedData = TransactionRequestSchema.parse(request.body);
    
    requestLogger.info('Transaction request validated', {
      tokenIn: validatedData.tokenIn,
      tokenOut: validatedData.tokenOut,
      amount: validatedData.amount,
      slippage: validatedData.slippage,
    });

    const transactionId = generateTransactionId();
    
    const database = getDatabaseConnection();
    const order = await database.order.create({
      data: {
        orderId: transactionId,
        tokenIn: validatedData.tokenIn,
        tokenOut: validatedData.tokenOut,
        amount: validatedData.amount,
        slippage: validatedData.slippage,
        status: 'pending',
        orderType: 'market',
      },
    });

    requestLogger.info('Transaction record created', {
      transactionId,
      databaseId: order.id,
    });

    await pipelineService.enqueue({
      transactionId,
      tokenIn: validatedData.tokenIn,
      tokenOut: validatedData.tokenOut,
      amount: validatedData.amount,
      slippage: validatedData.slippage,
      databaseId: order.id,
    });

    requestLogger.info('Transaction added to processing pipeline', {
      transactionId,
      pipelineStatus: 'queued',
    });

    const response = {
      orderId: transactionId,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      message: 'Order created successfully. Connect to WebSocket for real-time updates.',
      websocket: `ws://localhost:3000/api/orders/${transactionId}/stream`,
    };
    
    requestLogger.info('✅ Transaction execution completed successfully', {
      orderId: transactionId,
      responseStatus: 201,
      processingTime: `${Date.now() - startTime}ms`,
      websocketUrl: response.websocket,
    });
    
    return reply.status(201).send(response);

  } catch (error) {
    if (error instanceof z.ZodError) {
      requestLogger.error('Transaction validation failed', {
        error: error.message,
      });

      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid transaction parameters',
      });
    }

    requestLogger.fatal('Transaction processing failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return reply.status(500).send({
      success: false,
      error: 'PROCESSING_ERROR',
      message: 'Failed to process transaction request',
    });
  }
}

export async function stream(connection: WebSocket, request: FastifyRequest) {
  const connectionLogger = logger.withCorrelation(request.id || 'unknown');
  
  const { orderId } = request.params as { orderId: string };
  
  connectionLogger.info('🔌 WebSocket stream endpoint hit', {
    method: request.method,
    url: request.url,
    orderId,
    userAgent: request.headers['user-agent'],
    clientIP: request.ip,
    timestamp: new Date().toISOString(),
  });
  
  if (!orderId) {
    connectionLogger.error('❌ WebSocket connection rejected - missing orderId');
    connection.close();
    return;
  }
  
  connectionLogger.info('🔌 WebSocket streaming connection established', { orderId });

  const connectionId = streamOrchestrator.register(connection, request.id);

  connectionLogger.info('Streaming client registered', {
    connectionId,
    orderId,
    endpoint: request.url,
  });

  connection.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      const validatedMessage = WebSocketMessageSchema.parse(message);
      
      connectionLogger.debug('WebSocket message received', {
        type: validatedMessage.type,
        connectionId,
      });

      switch (validatedMessage.type) {
        case 'SUBSCRIBE_TRANSACTIONS':
          await handleSubscription(connectionId, validatedMessage.payload);
          break;
        case 'UNSUBSCRIBE_TRANSACTIONS':
          await handleUnsubscription(connectionId, validatedMessage.payload);
          break;
        default:
          connectionLogger.warn('Unknown WebSocket message type', {
            type: validatedMessage.type,
          });
      }
    } catch (messageError) {
      connectionLogger.error('WebSocket message processing failed', {
        error: messageError instanceof Error ? messageError.message : String(messageError),
        rawData: data.toString(),
      });

      streamOrchestrator.sendToClient(connectionId, {
        type: 'ERROR',
        payload: {
          message: 'Invalid message format',
          code: 'INVALID_MESSAGE',
        },
      });
    }
  });

  connection.on('close', () => {
    connectionLogger.info('WebSocket connection closed', {
      connectionId,
    });
    streamOrchestrator.unregister(connectionId);
  });

  connection.on('error', (error: any) => {
    connectionLogger.error('WebSocket connection error', {
      error: error.message,
      connectionId,
    });
    streamOrchestrator.unregister(connectionId);
  });

  streamOrchestrator.sendToClient(connectionId, {
    type: 'CONNECTION_ESTABLISHED',
    payload: {
      connectionId,
      timestamp: new Date().toISOString(),
      availableSubscriptions: ['transactions', 'system'],
    },
  });
}

function generateTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `txn_${timestamp}_${random}`;
}

async function handleSubscription(connectionId: string, payload: any) {
  logger.debug('Processing subscription request', {
    connectionId,
    payload,
  });

  const subscriptionType = payload?.type || 'transactions';
  streamOrchestrator.subscribe(connectionId, subscriptionType);

  streamOrchestrator.sendToClient(connectionId, {
    type: 'SUBSCRIPTION_CONFIRMED',
    payload: {
      subscriptionType,
      timestamp: new Date().toISOString(),
    },
  });
}

async function handleUnsubscription(connectionId: string, payload: any) {
  logger.debug('Processing unsubscription request', {
    connectionId,
    payload,
  });

  const subscriptionType = payload?.type || 'transactions';
  streamOrchestrator.unsubscribe(connectionId, subscriptionType);

  streamOrchestrator.sendToClient(connectionId, {
    type: 'UNSUBSCRIPTION_CONFIRMED',
    payload: {
      subscriptionType,
      timestamp: new Date().toISOString(),
    },
  });
}

export const transactionHandler = {
  execute,
  stream,
};
