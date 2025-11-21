import { initializeServer } from './server';
import { registerTransactionRoutes } from './gateway/transaction.gateway';
import { env } from './infrastructure/config/env.config';
import { createLogger } from './infrastructure/logging/system.logger';
import { getDatabaseConnection } from './infrastructure/config/database.config';
import { disconnectRedis } from './infrastructure/config/redis.config';
import { transactionProcessor } from './processors/transaction.processor';
import { pipelineService, streamOrchestrator } from './orchestrators';

const logger = createLogger('BOOTSTRAP');

export async function bootstrap() {
  try {
    logger.info('🚀 Initializing Transaction Processing Engine v2.0');

    const database = getDatabaseConnection();
    await database.$connect();
    logger.info('✅ Database layer initialized successfully');

    const server = initializeServer();

    await server.register(registerTransactionRoutes);
    logger.info('✅ Transaction gateway registered');

    const binding = await server.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info('🌐 Server is now accepting connections', {
      binding,
      port: env.PORT,
      environment: env.NODE_ENV,
      maxConcurrency: env.QUEUE_CONCURRENCY,
      throughputLimit: env.QUEUE_RATE_LIMIT,
    });

    logger.info('📡 Real-time streaming endpoint ready', {
      websocket: `ws://localhost:${env.PORT}/api/orders/:orderId/stream`,
    });

    logger.info('📊 Monitoring endpoints available', {
      health: `http://localhost:${env.PORT}/health`,
      stats: `http://localhost:${env.PORT}/api/orders/stats`,
      info: `http://localhost:${env.PORT}/`,
    });

    const performShutdown = async (signal: string) => {
      logger.info(`${signal} received - initiating graceful shutdown sequence`);

      try {
        await streamOrchestrator.terminateAll();
        logger.info('✅ Streaming connections terminated');

        await transactionProcessor.shutdown();
        logger.info('✅ Transaction processor stopped');

        await pipelineService.terminate();
        logger.info('✅ Pipeline orchestrator terminated');

        await server.close();
        logger.info('✅ Server shutdown complete');

        await disconnectRedis();
        logger.info('✅ Redis connection closed');

        await database.$disconnect();
        logger.info('✅ Database connection closed');

        logger.info('👋 Application shutdown completed successfully');
        process.exit(0);
      } catch (shutdownError) {
        logger.fatal('Critical error during shutdown', {
          error: shutdownError instanceof Error ? shutdownError.message : String(shutdownError),
        });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => performShutdown('SIGTERM'));
    process.on('SIGINT', () => performShutdown('SIGINT'));

  } catch (startupError) {
    const errorMessage = startupError instanceof Error ? startupError.message : String(startupError);
    const errorStack = startupError instanceof Error ? startupError.stack : undefined;
    
    logger.fatal('💥 Application startup failed', {
      error: errorMessage,
      stack: errorStack,
    });
    
    console.error('Startup Failure:', startupError);
    process.exit(1);
  }
}

bootstrap();
