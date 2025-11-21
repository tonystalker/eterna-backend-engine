import Redis from 'ioredis';
import { env } from './env.config';
import { createLogger } from '../logging/system.logger';

const logger = createLogger('REDIS');

// Redis connection instance
let redisInstance: Redis | null = null;

/**
 * Get Redis connection instance
 */
export function getRedisConnection(): Redis {
  if (!redisInstance) {
    logger.info('Establishing Redis connection');
    
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    // Connection event handlers
    redisInstance.on('connect', () => {
      logger.info('Redis connection established');
    });

    redisInstance.on('ready', () => {
      logger.debug('Redis client ready for commands');
    });

    redisInstance.on('error', (error) => {
      logger.error('Redis connection error', {
        error: error.message,
        code: (error as any).code,
      });
    });

    redisInstance.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisInstance.on('reconnecting', () => {
      logger.info('Redis reconnection attempt in progress');
    });

    // Initialize connection
    redisInstance.connect().catch((error) => {
      logger.fatal('Failed to establish Redis connection', {
        error: error.message,
      });
      throw error;
    });
  }

  return redisInstance;
}

/**
 * Close Redis connection
 */
export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info('Redis connection terminated');
  }
}
