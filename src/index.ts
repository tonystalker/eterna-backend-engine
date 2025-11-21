import { createApp } from './app';
import { registerOrderRoutes } from './routes/order.routes';
import { env } from './config/env.config';
import { logger } from './utils/logger';
import { getPrismaClient } from './config/database.config';
import { disconnectRedis } from './config/redis.config';
import { orderWorker } from './workers/order.worker';
import { queueService } from './services/queue.service';
import { websocketService } from './services/websocket.service';

/**
 * Start the application
 */
async function start() {
  try {
    logger.info('🚀 Starting Order Execution Engine...');

    // Initialize database connection
    const prisma = getPrismaClient();
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Create Fastify app
    const app = createApp();

    // Register routes
    await app.register(registerOrderRoutes);

    // Start server
    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(
      {
        address,
        port: env.PORT,
        env: env.NODE_ENV,
        concurrency: env.QUEUE_CONCURRENCY,
        rateLimit: env.QUEUE_RATE_LIMIT,
      },
      '✅ Server started successfully'
    );

    logger.info(`📡 WebSocket endpoint: ws://localhost:${env.PORT}/api/orders/execute`);
    logger.info(`📊 Health check: http://localhost:${env.PORT}/health`);
    logger.info(`📈 Stats endpoint: http://localhost:${env.PORT}/api/orders/stats`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      try {
        // Close WebSocket connections
        await websocketService.closeAll();
        logger.info('✅ WebSocket connections closed');

        // Close worker
        await orderWorker.close();
        logger.info('✅ Worker closed');

        // Close queue
        await queueService.close();
        logger.info('✅ Queue closed');

        // Close server
        await app.close();
        logger.info('✅ Server closed');

        // Disconnect Redis
        await disconnectRedis();
        logger.info('✅ Redis disconnected');

        // Disconnect database
        await prisma.$disconnect();
        logger.info('✅ Database disconnected');

        logger.info('👋 Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error({ error: errorMessage, stack: errorStack }, '❌ Failed to start server');
    console.error('Startup Error:', error);
    process.exit(1);
  }
}

// Start the application
start();
