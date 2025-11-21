import { PrismaClient } from '@prisma/client';
import { env } from './env.config';
import { createLogger } from '../logging/system.logger';

const logger = createLogger('DATABASE');

// Database connection instance
let prismaInstance: PrismaClient | null = null;

/**
 * Get database connection instance
 */
export function getDatabaseConnection(): PrismaClient {
  if (!prismaInstance) {
    logger.info('Creating database connection');
    
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
      log: env.NODE_ENV === 'development' ? [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ] : [],
    });

    // Logging configuration for development
    if (env.NODE_ENV === 'development') {
      // Note: Prisma event logging disabled for TypeScript compatibility
      // Can be re-enabled with proper type definitions if needed
    }

    logger.info('Database connection established');
  }

  return prismaInstance;
}

/**
 * Close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    logger.info('Database connection closed');
  }
}
