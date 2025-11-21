import { Worker } from 'bullmq';
import { getRedisConnection } from '../infrastructure/config/redis.config';
import { env } from '../infrastructure/config/env.config';
import { createLogger } from '../infrastructure/logging/system.logger';
import { marketTransactionProcessor } from './market-transaction.processor';

const logger = createLogger('TRANSACTION_PROCESSOR');

// Worker instance
export class TransactionProcessor {
  private worker: Worker | null = null;

  /**
   * Initialize the transaction processor
   */
  async initialize(): Promise<void> {
    logger.info('Initializing transaction processor worker');

    const redis = getRedisConnection();

    this.worker = new Worker(
      'transaction-processing',
      async (job) => {
        const jobLogger = logger.withCorrelation(job.id || 'unknown');
        
        try {
          jobLogger.info('Processing transaction job', {
            transactionId: job.data?.transactionId,
            attemptNumber: job.attemptsMade + 1,
          });

          // Process the transaction using market processor
          const result = await marketTransactionProcessor.process(
            job.data,
            (progress) => {
              jobLogger.debug('Transaction progress update', progress);
              job.updateProgress(progress);
            }
          );

          jobLogger.info('Transaction job completed successfully', {
            transactionId: job.data?.transactionId,
            finalStatus: result.status,
          });

          return result;

        } catch (processingError) {
          jobLogger.error('Transaction job processing failed', {
            transactionId: job.data?.transactionId,
            error: processingError instanceof Error ? processingError.message : String(processingError),
            attemptNumber: job.attemptsMade + 1,
          });
          throw processingError;
        }
      },
      {
        connection: redis,
        concurrency: env.QUEUE_CONCURRENCY,
        limiter: {
          max: env.QUEUE_RATE_LIMIT,
          duration: 60000,
        },
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job) => {
      logger.info('Transaction job completed', {
        jobId: job.id,
        transactionId: job.data?.transactionId,
        processingTime: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined,
      });
    });

    this.worker.on('failed', (job, error) => {
      logger.error('Transaction job failed', {
        jobId: job?.id,
        transactionId: job?.data?.transactionId,
        error: error.message,
        attemptsMade: job?.attemptsMade,
      });
    });

    this.worker.on('error', (error) => {
      logger.error('Transaction processor worker error', {
        error: error.message,
      });
    });

    logger.info('Transaction processor worker initialized', {
      concurrency: env.QUEUE_CONCURRENCY,
      rateLimit: env.QUEUE_RATE_LIMIT,
    });
  }

  /**
   * Get processor statistics
   */
  async getStatistics() {
    if (!this.worker) {
      return {
        active: 0,
        waiting: 0,
        completed: 0,
        failed: 0,
      };
    }

    // Return default statistics - actual queue statistics would require separate queue instance
    return {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
    };
  }

  /**
   * Shutdown the processor
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down transaction processor');

    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      logger.info('Transaction processor worker shutdown complete');
    }
  }
}

// Export singleton instance
export const transactionProcessor = new TransactionProcessor();
