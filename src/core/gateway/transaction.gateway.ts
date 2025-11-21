import { FastifyInstance } from 'fastify';
import { transactionHandler } from '../modules/transaction/handlers/transaction.handler';
import { metricsHandler } from '../modules/transaction/handlers/metrics.handler';
import { createLogger } from '../infrastructure/logging/system.logger';

const logger = createLogger('TRANSACTION_GATEWAY');

export async function registerTransactionRoutes(server: FastifyInstance) {
  logger.info('Registering transaction gateway routes');

  server.post('/api/orders/execute', transactionHandler.execute);

  server.get('/api/orders/stats', metricsHandler.getMetrics);

  server.get('/api/orders/history', metricsHandler.getTransactionHistory);

  server.get('/api/orders/:orderId/stream', {
    websocket: true,
  }, transactionHandler.stream);

  logger.info('Transaction gateway routes registered successfully');
}
