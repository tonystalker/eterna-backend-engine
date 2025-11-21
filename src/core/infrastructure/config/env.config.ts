import { config } from 'dotenv';

// Load environment variables
config();

// Debug: Log environment variables (without sensitive data)
console.log('Environment variables loaded:', {
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
  REDIS_URL: process.env.REDIS_URL ? 'SET' : 'MISSING',
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
});

/**
 * Application configuration interface
 */
interface AppConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  QUEUE_CONCURRENCY: number;
  QUEUE_RATE_LIMIT: number;
  LOG_LEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

/**
 * Environment configuration with validation
 */
export const env: AppConfig = {
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development',
  PORT: parseInt(process.env.PORT || '8080', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/transaction_engine?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://MISSING_REDIS_URL_ENV_VAR:6379',
  QUEUE_CONCURRENCY: parseInt(process.env.QUEUE_CONCURRENCY || '10', 10),
  QUEUE_RATE_LIMIT: parseInt(process.env.QUEUE_RATE_LIMIT || '100', 10),
  LOG_LEVEL: process.env.LOG_LEVEL as 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' || 'info',
};

// Configuration validation
function validateConfiguration(): void {
  const requiredFields: (keyof AppConfig)[] = ['DATABASE_URL', 'REDIS_URL'];
  const missing = requiredFields.filter(field => !env[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (env.PORT < 1 || env.PORT > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  if (env.QUEUE_CONCURRENCY < 1) {
    throw new Error('QUEUE_CONCURRENCY must be greater than 0');
  }

  if (env.QUEUE_RATE_LIMIT < 1) {
    throw new Error('QUEUE_RATE_LIMIT must be greater than 0');
  }
}

// Perform configuration validation
validateConfiguration();
