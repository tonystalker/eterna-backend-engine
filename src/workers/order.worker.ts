import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis.config';
import { getPrismaClient } from '../config/database.config';
import { env } from '../config/env.config';
import { logger } from '../utils/logger';
import { QUEUE_CONFIG, ORDER_STATUS } from '../utils/constants';
import { OrderJobData, OrderStatusUpdate } from '../models/types';
import { OrderExecutorFactory } from '../executors/executor.factory';
import { websocketService } from '../services/websocket.service';

/**
 * BullMQ Worker for processing orders
 */
export class OrderWorker {
  private worker: Worker<OrderJobData>;
  private prisma = getPrismaClient();

  constructor() {
    const connection = getRedisClient();

    this.worker = new Worker<OrderJobData>(
      QUEUE_CONFIG.NAME,
      async (job: Job<OrderJobData>) => this.processOrder(job),
      {
        connection,
        concurrency: env.QUEUE_CONCURRENCY,
        limiter: {
          max: env.QUEUE_RATE_LIMIT,
          duration: QUEUE_CONFIG.RATE_LIMIT_DURATION,
        },
      }
    );

    this.setupEventListeners();

    logger.info(
      {
        queueName: QUEUE_CONFIG.NAME,
        concurrency: env.QUEUE_CONCURRENCY,
        rateLimit: `${env.QUEUE_RATE_LIMIT} jobs/${QUEUE_CONFIG.RATE_LIMIT_DURATION}ms`,
      },
      'Order worker started'
    );
  }

  /**
   * Process an order job
   */
  private async processOrder(job: Job<OrderJobData>): Promise<void> {
    const { orderId, order } = job.data;
    const attemptNumber = job.attemptsMade + 1;

    logger.info(
      {
        orderId,
        jobId: job.id,
        attempt: attemptNumber,
      },
      'Processing order'
    );

    try {
      // Update order status to pending in database
      await this.updateOrderInDB(orderId, ORDER_STATUS.PENDING, {});

      // Get appropriate executor based on order type
      const executor = OrderExecutorFactory.getExecutor(order.orderType);

      // Status callback to emit updates
      const statusCallback = async (update: OrderStatusUpdate) => {
        await this.emitStatusUpdate(update);

        // Update database for key states
        if (
          update.status === ORDER_STATUS.CONFIRMED ||
          update.status === ORDER_STATUS.FAILED
        ) {
          await this.updateOrderInDB(orderId, update.status, {
            selectedDex: update.data?.selectedDex,
            executedPrice: update.data?.executedPrice,
            txHash: update.data?.txHash,
            error: update.data?.error,
            attempts: attemptNumber,
          });
        }
      };

      // Execute the order
      const result = await executor.execute(order, statusCallback);

      if (!result.success) {
        // If execution failed, throw error to trigger retry
        throw new Error(result.error || 'Order execution failed');
      }

      logger.info(
        {
          orderId,
          txHash: result.txHash,
          executedPrice: result.executedPrice,
        },
        'Order processed successfully'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        {
          orderId,
          attempt: attemptNumber,
          error: errorMessage,
        },
        'Order processing failed'
      );

      // If this is the final attempt, mark as failed
      if (attemptNumber >= QUEUE_CONFIG.MAX_ATTEMPTS) {
        await this.emitStatusUpdate({
          orderId,
          status: ORDER_STATUS.FAILED,
          timestamp: new Date(),
          data: {
            error: `Max retries exceeded: ${errorMessage}`,
          },
        });

        await this.updateOrderInDB(orderId, ORDER_STATUS.FAILED, {
          error: `Max retries (${QUEUE_CONFIG.MAX_ATTEMPTS}) exceeded: ${errorMessage}`,
          attempts: attemptNumber,
        });
      }

      // Re-throw to trigger BullMQ retry mechanism
      throw error;
    }
  }

  /**
   * Emit status update via WebSocket
   */
  private async emitStatusUpdate(update: OrderStatusUpdate): Promise<void> {
    try {
      await websocketService.publishStatusUpdate(update);
    } catch (error) {
      logger.error({ error, update }, 'Failed to emit status update');
      // Don't throw - we don't want to fail the job just because WS failed
    }
  }

  /**
   * Update order in database
   */
  private async updateOrderInDB(
    orderId: string,
    status: string,
    data: {
      selectedDex?: string;
      executedPrice?: number;
      txHash?: string;
      error?: string;
      attempts?: number;
    }
  ): Promise<void> {
    try {
      await this.prisma.order.update({
        where: { orderId },
        data: {
          status,
          ...data,
          updatedAt: new Date(),
        },
      });

      logger.debug({ orderId, status }, 'Order updated in database');
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to update order in database');
      // Don't throw - database update failure shouldn't stop execution
    }
  }

  /**
   * Setup worker event listeners
   */
  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Job completed');
    });

    this.worker.on('failed', (job, error) => {
      logger.error(
        {
          jobId: job?.id,
          error: error.message,
          attemptsMade: job?.attemptsMade,
        },
        'Job failed'
      );
    });

    this.worker.on('error', (error) => {
      logger.error({ error: error.message }, 'Worker error');
    });
  }

  /**
   * Close worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    logger.info('Order worker closed');
  }

  /**
   * Get worker instance
   */
  getWorker(): Worker<OrderJobData> {
    return this.worker;
  }
}

// Export singleton instance
export const orderWorker = new OrderWorker();
