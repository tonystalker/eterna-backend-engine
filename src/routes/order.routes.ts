import { FastifyInstance } from 'fastify';
import { orderController } from '../controllers/order.controller';
import { websocketService } from '../services/websocket.service';
import { logger } from '../utils/logger';
import { CreateOrderRequest } from '../models/types';

/**
 * Register order routes
 */
export async function registerOrderRoutes(app: FastifyInstance) {
  /**
   * POST /api/orders/execute
   * Submit a new market order
   */
  app.post('/api/orders/execute', async (request, reply) => {
    try {
      // Create order
      const { orderId, order } = await orderController.createOrder(
        request.body as CreateOrderRequest
      );

      // Return order details with WebSocket connection info
      return reply.status(201).send({
        orderId,
        status: order.status,
        timestamp: order.createdAt,
        message: 'Order created successfully. Connect to WebSocket for real-time updates.',
        websocket: `ws://localhost:3000/api/orders/${orderId}/stream`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create order';
      logger.error({ error, body: request.body }, 'Order creation failed');

      return reply.status(400).send({
        error: 'Bad Request',
        message,
      });
    }
  });

  /**
   * GET /api/orders/:orderId/stream (WebSocket)
   * WebSocket endpoint for real-time order status updates
   */
  app.get(
    '/api/orders/:orderId/stream',
    { websocket: true },
    (socket, request) => {
      const { orderId } = request.params as { orderId: string };

      if (!orderId) {
        logger.error('WebSocket connection without orderId');
        socket.close();
        return;
      }

      logger.info({ orderId }, 'WebSocket connection established');
      websocketService.registerConnection(orderId, socket);
    }
  );

  /**
   * GET /api/orders/stats
   * Get queue and connection statistics
   */
  app.get('/api/orders/stats', async () => {
    const queueStats = await orderController.getQueueStats();
    const connectionCount = orderController.getConnectionCount();

    return {
      queue: queueStats,
      websocket: {
        connections: connectionCount,
      },
      timestamp: new Date().toISOString(),
    };
  });

  logger.info('Order routes registered');
}
