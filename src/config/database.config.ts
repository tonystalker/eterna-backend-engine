import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

let prisma: PrismaClient;

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query' as never, (e: unknown) => {
        const event = e as { query: string; duration: number };
        logger.debug({ query: event.query, duration: event.duration }, 'Database Query');
      });
    }

    // Graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
      logger.info('Prisma client disconnected');
    });
  }

  return prisma;
};

export { prisma };
