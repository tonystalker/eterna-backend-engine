import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { env } from './config/env.config';
import { logger } from './utils/logger';

/**
 * Error Handler Middleware
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error(
    {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    },
    'Request error'
  );

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  // Not found errors
  if (error.statusCode === 404) {
    return reply.status(404).send({
      error: 'Not Found',
      message: 'Resource not found',
    });
  }

  // Internal server errors
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'production' ? 'An error occurred' : error.message,
  });
}

/**
 * Create and configure Fastify app
 */
export function createApp() {
  const app = Fastify({
    logger: false, // Using Pino separately
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    disableRequestLogging: true,
  });

  // Register WebSocket plugin
  app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Root endpoint
  app.get('/', async () => {
    return {
      name: 'Order Execution Engine',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        executeOrder: 'POST /api/orders/execute',
      },
    };
  });

  // Register error handler
  app.setErrorHandler(errorHandler);

  return app;
}
