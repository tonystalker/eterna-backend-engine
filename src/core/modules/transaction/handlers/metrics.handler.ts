import { FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '../../../infrastructure/logging/system.logger';
import { getDatabaseConnection } from '../../../infrastructure/config/database.config';
import { pipelineService, streamOrchestrator } from '../../../orchestrators';

const logger = createLogger('METRICS_HANDLER');

export const metricsHandler = {
  getMetrics,
  getTransactionHistory,
};

export async function getMetrics(request: FastifyRequest, reply: FastifyReply) {
  const requestLogger = logger.withCorrelation(request.id || 'unknown');
  const startTime = Date.now();
  
  // Log incoming request details
  requestLogger.info('📊 Metrics endpoint hit', {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    clientIP: request.ip,
    timestamp: new Date().toISOString(),
  });
  
  try {
    requestLogger.info('Metrics request received');

    const pipelineStats = await pipelineService.getStatistics();
    
    const streamingStats = streamOrchestrator.getStatistics();

    const database = getDatabaseConnection();
    const totalTransactions = await database.order.count();
    const pendingTransactions = await database.order.count({
      where: { status: 'pending' },
    });
    const completedTransactions = await database.order.count({
      where: { status: 'confirmed' },
    });
    const failedTransactions = await database.order.count({
      where: { status: 'failed' },
    });

    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0',
      },
      pipeline: {
        ...pipelineStats,
        processingRate: pipelineStats.completed / (pipelineStats.total || 1) * 100,
      },
      streaming: streamingStats,
      transactions: {
        total: totalTransactions,
        pending: pendingTransactions,
        completed: completedTransactions,
        failed: failedTransactions,
        successRate: totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0,
      },
    };

    requestLogger.info('Metrics retrieved successfully', {
      totalTransactions,
      pipelineActive: pipelineStats.active,
      streamingConnections: streamingStats.connections,
    });

    return reply.status(200).send({
      queue: metrics.pipeline,
      websocket: {
        connections: metrics.streaming.connections,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (metricsError) {
    requestLogger.error('Failed to retrieve metrics', {
      error: metricsError instanceof Error ? metricsError.message : String(metricsError),
    });

    return reply.status(500).send({
      success: false,
      error: 'METRICS_ERROR',
      message: 'Failed to retrieve system metrics',
    });
  } finally {
    requestLogger.info('📊 Metrics request completed', {
      processingTime: `${Date.now() - startTime}ms`,
    });
  }
}

export async function getTransactionHistory(request: FastifyRequest, reply: FastifyReply) {
  const requestLogger = logger.withCorrelation(request.id || 'unknown');
  const startTime = Date.now();
  
  // Log incoming request details
  requestLogger.info('📜 Transaction history endpoint hit', {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    clientIP: request.ip,
    timestamp: new Date().toISOString(),
  });
  
  try {
    const { limit = 50, offset = 0, status } = request.query as any;
    
    requestLogger.info('Transaction history request received', {
      limit,
      offset,
      status,
    });

    const database = getDatabaseConnection();
    
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const orders = await database.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        orderId: true,
        tokenIn: true,
        tokenOut: true,
        amount: true,
        slippage: true,
        status: true,
        selectedDex: true,
        executedPrice: true,
        txHash: true,
        error: true,
        attempts: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalCount = await database.order.count({ where: whereClause });

    const response = {
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < totalCount,
      },
      transactions: orders.map((order: any) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
    };

    requestLogger.info('📜 Transaction history retrieved successfully', {
      count: orders.length,
      total: totalCount,
      status,
      processingTime: `${Date.now() - startTime}ms`,
    });

    return reply.status(200).send({
      success: true,
      data: response,
    });

  } catch (historyError) {
    requestLogger.error('Failed to retrieve transaction history', {
      error: historyError instanceof Error ? historyError.message : String(historyError),
    });

    return reply.status(500).send({
      success: false,
      error: 'HISTORY_ERROR',
      message: 'Failed to retrieve transaction history',
    });
  }
}
