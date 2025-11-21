/**
 * Application-wide constants
 */

// DEX Names
export const DEX = {
  RAYDIUM: 'Raydium',
  METEORA: 'Meteora',
} as const;

// Order Status States
export const ORDER_STATUS = {
  PENDING: 'pending',
  ROUTING: 'routing',
  BUILDING: 'building',
  SUBMITTED: 'submitted',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
} as const;

// Order Types
export const ORDER_TYPE = {
  MARKET: 'market',
  LIMIT: 'limit',
  SNIPER: 'sniper',
} as const;

// Queue Configuration
export const QUEUE_CONFIG = {
  NAME: 'order-queue',
  CONCURRENCY: 10,
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_DURATION: 60000, // 1 minute in ms
  MAX_ATTEMPTS: 3,
  BACKOFF_DELAY: 1000, // Base delay in ms
} as const;

// DEX Configuration (Mock)
export const DEX_CONFIG = {
  RAYDIUM: {
    FEE: 0.003, // 0.3%
    QUOTE_DELAY: 200, // ms
    PRICE_VARIANCE_MIN: 0.98,
    PRICE_VARIANCE_MAX: 1.02,
  },
  METEORA: {
    FEE: 0.002, // 0.2%
    QUOTE_DELAY: 200, // ms
    PRICE_VARIANCE_MIN: 0.97,
    PRICE_VARIANCE_MAX: 1.02,
  },
  EXECUTION_DELAY_MIN: 2000, // ms
  EXECUTION_DELAY_MAX: 3000, // ms
} as const;

// Slippage Configuration
export const SLIPPAGE = {
  DEFAULT: 0.01, // 1%
  MIN: 0.001, // 0.1%
  MAX: 0.1, // 10%
} as const;

// WebSocket Events
export const WS_EVENTS = {
  ORDER_UPDATE: 'order:update',
  ORDER_COMPLETED: 'order:completed',
  ORDER_FAILED: 'order:failed',
  CONNECTION_ESTABLISHED: 'connection:established',
} as const;

// Redis Keys
export const REDIS_KEYS = {
  ACTIVE_ORDER: (orderId: string) => `active:order:${orderId}`,
  ORDER_CHANNEL: (orderId: string) => `channel:order:${orderId}`,
} as const;
