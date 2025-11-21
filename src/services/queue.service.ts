import { Queue, QueueOptions } from 'bullmq';
import { getRedisClient } from '../config/redis.config';
import { env } from '../config/env.config';
import { logger } from '../utils/logger';
import { QUEUE_CONFIG } from '../utils/constants';
import { OrderJobData } from '../models/types';

/**
 * Queue Service for managing order processing queue
 */
export class QueueService {
  private queue: Queue<OrderJobData>;

  constructor() {
    const connection = getRedisClient();

    const queueOptions: QueueOptions = {
      connection,
      defaultJobOptions: {
        attempts: QUEUE_CONFIG.MAX_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: QUEUE_CONFIG.BACKOFF_DELAY,
        },
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
        },
      },
    };

    this.queue = new Queue<OrderJobData>(QUEUE_CONFIG.NAME, queueOptions);

    // Setup event listeners
    this.setupEventListeners();

    logger.info(
      {
        queueName: QUEUE_CONFIG.NAME,
        concurrency: env.QUEUE_CONCURRENCY,
        rateLimit: env.QUEUE_RATE_LIMIT,
      },
      'Queue service initialized'
    );
  }

  /**
   * Add order to processing queue
   */
  async addOrder(jobData: OrderJobData): Promise<string> {
    try {
      const job = await this.queue.add(
        `order-${jobData.orderId}`,
        jobData,
        {
          jobId: jobData.orderId,
          attempts: QUEUE_CONFIG.MAX_ATTEMPTS,
        }
      );

      logger.info(
        {
          jobId: job.id,
          orderId: jobData.orderId,
          queuePosition: await this.queue.count(),
        },
        'Order added to queue'
      );

      return job.id!;
    } catch (error) {
      logger.error({ error, orderId: jobData.orderId }, 'Failed to add order to queue');
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string) {
    return this.queue.getJob(jobId);
  }

  /**
   * Setup queue event listeners
   */
  private setupEventListeners(): void {
    // Note: Queue events are emitted by the QueueEvents class in BullMQ
    // For simplicity, we're just logging here. In production, use QueueEvents
    this.queue.on('error', (error: Error) => {
      logger.error({ error: error.message }, 'Queue error');
    });

    logger.debug('Queue event listeners configured');
  }

  /**
   * Close queue connection
   */
  async close(): Promise<void> {
    await this.queue.close();
    logger.info('Queue service closed');
  }

  /**
   * Get the Queue instance (for worker registration)
   */
  getQueue(): Queue<OrderJobData> {
    return this.queue;
  }
}

// Export singleton instance
export const queueService = new QueueService();
