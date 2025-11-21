/**
 * Jest test setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/order_engine_test?schema=public';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.QUEUE_CONCURRENCY = '5';
process.env.QUEUE_RATE_LIMIT = '50';
process.env.LOG_LEVEL = 'error';

// Mock logger to reduce test output
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(10000);
