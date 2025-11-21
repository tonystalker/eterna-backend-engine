import Redis from 'ioredis';
import { env } from './env.config';
import { logger } from '../utils/logger';

let redisClient: Redis;
let redisPubClient: Redis;
let redisSubClient: Redis;

/**
 * Get main Redis client for general operations
 */
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ blocking operations
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('error', (err: Error) => {
      logger.error({ err: err.message }, 'Redis client error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });
  }

  return redisClient;
};

/**
 * Get Redis client for publishing messages
 */
export const getRedisPubClient = (): Redis => {
  if (!redisPubClient) {
    redisPubClient = new Redis(env.REDIS_URL, {
      lazyConnect: false,
    });

    redisPubClient.on('connect', () => {
      logger.info('Redis Pub client connected');
    });

    redisPubClient.on('error', (err: Error) => {
      logger.error({ err: err.message }, 'Redis Pub client error');
    });
  }

  return redisPubClient;
};

/**
 * Get Redis client for subscribing to messages
 */
export const getRedisSubClient = (): Redis => {
  if (!redisSubClient) {
    redisSubClient = new Redis(env.REDIS_URL, {
      lazyConnect: false,
    });

    redisSubClient.on('connect', () => {
      logger.info('Redis Sub client connected');
    });

    redisSubClient.on('error', (err: Error) => {
      logger.error({ err: err.message }, 'Redis Sub client error');
    });
  }

  return redisSubClient;
};

/**
 * Graceful shutdown for all Redis connections
 */
export const disconnectRedis = async (): Promise<void> => {
  const clients = [redisClient, redisPubClient, redisSubClient].filter(Boolean);
  
  await Promise.all(
    clients.map(async (client) => {
      if (client) {
        await client.quit();
      }
    })
  );
  
  logger.info('All Redis connections closed');
};

// Graceful shutdown handler
process.on('SIGTERM', disconnectRedis);
process.on('SIGINT', disconnectRedis);
