// Main entry point for the refactored Transaction Processing Engine
export { bootstrap } from './bootstrap';
export { initializeServer } from './server';
export { createLogger } from './infrastructure/logging/system.logger';
export { env } from './infrastructure/config/env.config';
export { getDatabaseConnection } from './infrastructure/config/database.config';
export { getRedisConnection } from './infrastructure/config/redis.config';
