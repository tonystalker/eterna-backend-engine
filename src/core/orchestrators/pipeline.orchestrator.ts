import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from '../infrastructure/config/redis.config';
import { env } from '../infrastructure/config/env.config';
import { createLogger } from '../infrastructure/logging/system.logger';
import { marketTransactionProcessor } from '../processors/market-transaction.processor';

const logger = createLogger('PIPELINE_ORCHESTRATOR');

const PIPELINE_NAME = 'transaction-processing';

let processingQueue: Queue | null = null;
let processingWorker: Worker | null = null;

export async function initializePipeline(): Promise<void> {
  logger.info('Initializing transaction processing pipeline');

  const redis = getRedisConnection();

  processingQueue = new Queue(PIPELINE_NAME, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  processingWorker = new Worker(
    PIPELINE_NAME,
    async (job) => {
      const jobLogger = logger.withCorrelation(job.id || 'unknown');
      
      try {
        jobLogger.info('Processing transaction job', {
          transactionId: job.data?.transactionId,
          attemptNumber: job.attemptsMade + 1,
        });

        // Process the transaction
        await marketTransactionProcessor.process(job.data, (update) => {
          jobLogger.debug('Transaction progress update', update);
          // Emit progress event
          job.updateProgress(update);
        });

        jobLogger.info('Transaction processing completed', {
          transactionId: job.data?.transactionId,
        });

      } catch (processingError) {
        jobLogger.error('Transaction processing failed', {
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

  processingWorker.on('completed', (job) => {
    logger.info('Transaction job completed', {
      jobId: job.id,
      transactionId: job.data?.transactionId,
      processingTime: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined,
    });
  });

  processingWorker.on('failed', (job, error) => {
    logger.error('Transaction job failed', {
      jobId: job?.id,
      transactionId: job?.data?.transactionId,
      error: error.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  processingWorker.on('error', (error) => {
    logger.error('Pipeline worker error', {
      error: error.message,
    });
  });

  logger.info('Transaction processing pipeline initialized', {
    concurrency: env.QUEUE_CONCURRENCY,
    rateLimit: env.QUEUE_RATE_LIMIT,
    maxRetries: 3,
  });
}

export async function enqueue(transactionData: any): Promise<string> {
  if (!processingQueue) {
    await initializePipeline();
  }

  const job = await processingQueue!.add('process-transaction', transactionData, {
    priority: transactionData.priority || 0,
    delay: transactionData.delay || 0,
  });

  logger.info('Transaction enqueued for processing', {
    jobId: job.id,
    transactionId: transactionData.transactionId,
    priority: transactionData.priority || 0,
  });

  return job.id!;
}

export async function getStatistics() {
  if (!processingQueue) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
    };
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    processingQueue.getWaiting(),
    processingQueue.getActive(),
    processingQueue.getCompleted(),
    processingQueue.getFailed(),
    processingQueue.getDelayed(),
  ]);

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    total: waiting.length + active.length + completed.length + failed.length + delayed.length,
  };
}

export async function terminate(): Promise<void> {
  logger.info('Terminating transaction processing pipeline');

  if (processingWorker) {
    await processingWorker.close();
    processingWorker = null;
    logger.info('Pipeline worker terminated');
  }

  if (processingQueue) {
    await processingQueue.close();
    processingQueue = null;
    logger.info('Processing queue terminated');
  }

  logger.info('Transaction processing pipeline terminated');
}

export const pipelineService = {
  enqueue,
  getStatistics,
  terminate,
  initialize: initializePipeline,
};
