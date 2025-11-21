import { getPrismaClient } from '../config/database.config';
import { queueService } from '../services/queue.service';
import { websocketService } from '../services/websocket.service';
import { logger } from '../utils/logger';
import { generateOrderId } from '../utils/helpers';
import { ORDER_STATUS, SLIPPAGE, ORDER_TYPE } from '../utils/constants';
import { CreateOrderRequest, Order, OrderJobData } from '../models/types';
import { createOrderSchema, formatValidationError } from '../middleware/validation.middleware';
import { ZodError } from 'zod';

/**
 * Order Controller
 * Handles order creation, validation, and queue submission
 */
export class OrderController {
  private prisma = getPrismaClient();

  /**
   * Create and submit a new order
   */
  async createOrder(request: CreateOrderRequest): Promise<{ orderId: string; order: Order }> {
    try {
      // Validate request
      const validatedData = createOrderSchema.parse(request);

      // Generate unique order ID
      const orderId = generateOrderId();

      // Create order object
      const order: Order = {
        orderId,
        orderType: validatedData.orderType || ORDER_TYPE.MARKET,
        tokenIn: validatedData.tokenIn,
        tokenOut: validatedData.tokenOut,
        amount: validatedData.amount,
        slippage: validatedData.slippage || SLIPPAGE.DEFAULT,
        status: ORDER_STATUS.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      await this.prisma.order.create({
        data: {
          orderId: order.orderId,
          orderType: order.orderType,
          tokenIn: order.tokenIn,
          tokenOut: order.tokenOut,
          amount: order.amount,
          slippage: order.slippage,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      });

      logger.info(
        {
          orderId,
          tokenIn: order.tokenIn,
          tokenOut: order.tokenOut,
          amount: order.amount,
        },
        'Order created in database'
      );

      // Add to queue
      const jobData: OrderJobData = {
        orderId,
        order,
      };

      await queueService.addOrder(jobData);

      // Emit pending status
      await websocketService.publishStatusUpdate({
        orderId,
        status: ORDER_STATUS.PENDING,
        timestamp: new Date(),
      });

      return { orderId, order };
    } catch (error) {
      if (error instanceof ZodError) {
        const message = formatValidationError(error);
        logger.error({ error: message }, 'Validation error');
        throw new Error(message);
      }

      logger.error({ error }, 'Failed to create order');
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return queueService.getQueueStats();
  }

  /**
   * Get WebSocket connection count
   */
  getConnectionCount(): number {
    return websocketService.getConnectionCount();
  }
}

// Export singleton instance
export const orderController = new OrderController();
