import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { env } from './infrastructure/config/env.config';
import { createLogger } from './infrastructure/logging/system.logger';

const logger = createLogger('SERVER_CORE');

function globalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestLogger = logger.withCorrelation(request.id || 'unknown');
  
  requestLogger.error('Request processing failed', {
    error: error.message,
    stack: error.stack,
    endpoint: request.url,
    method: request.method,
    userAgent: request.headers['user-agent'],
  });

  // Input validation failures
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: 'INVALID_INPUT',
      details: error.validation,
      message: 'Request validation failed',
    });
  }

  // Resource not found
  if (error.statusCode === 404) {
    return reply.status(404).send({
      success: false,
      error: 'NOT_FOUND',
      message: 'Requested resource does not exist',
    });
  }

  // Default server error response
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: 'INTERNAL_ERROR',
    message: env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
  });
}

export function initializeServer() {
  logger.info('Initializing application server instance');

  const server = Fastify({
    logger: false, // Using custom logger
    trustProxy: true,
    requestIdHeader: 'x-correlation-id',
    disableRequestLogging: true,
  });

  // WebSocket integration
  server.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB limit
    },
  });

  server.get('/health', async (request, reply) => {
    console.log('🎯 HEALTH ENDPOINT HIT!');
    
    const startTime = Date.now();
    
    logger.info('💚 Health check endpoint hit', {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      clientIP: request.ip,
      timestamp: new Date().toISOString(),
    });
    
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    
    logger.info('💚 Health check completed', {
      status: response.status,
      uptime: `${Math.floor(response.uptime)}s`,
      processingTime: `${Date.now() - startTime}ms`,
    });
    
    return reply.status(200).send(response);
  });

  server.get('/', async (request, reply) => {
    console.log('🏠 ROOT ENDPOINT HIT!');
    
    const startTime = Date.now();
    
    logger.info('🏠 Root endpoint hit', {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      clientIP: request.ip,
      timestamp: new Date().toISOString(),
    });
    
    const response = {
      name: 'Order Execution Engine',
      version: '2.0.0',
      endpoints: {
        health: '/health',
        executeOrder: 'POST /api/orders/execute',
        orderStats: 'GET /api/orders/stats',
        orderHistory: 'GET /api/orders/history',
        websocket: 'WS /api/orders/:orderId/stream',
      },
    };
    
    logger.info('🏠 Root endpoint completed', {
      engineName: response.name,
      version: response.version,
      processingTime: `${Date.now() - startTime}ms`,
    });
    
    return reply.status(200).send(response);
  });

  server.setErrorHandler(globalErrorHandler);

  logger.info('Server configuration completed', {
    port: env.PORT,
    environment: env.NODE_ENV,
    maxPayload: '1MB',
    correlationHeader: 'x-correlation-id',
  });

  return server;
}
