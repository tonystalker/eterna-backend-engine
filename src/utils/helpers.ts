/**
 * Utility helper functions
 */

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Generate a unique order ID
 */
export const generateOrderId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `ord_${timestamp}_${random}`;
};

/**
 * Generate a mock transaction hash
 */
export const generateMockTxHash = (): string => {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

/**
 * Calculate exponential backoff delay
 * @param attempt - Attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 */
export const calculateBackoff = (attempt: number, baseDelay = 1000): number => {
  return Math.min(baseDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
};

/**
 * Format number to fixed decimal places
 */
export const formatPrice = (price: number, decimals = 6): string => {
  return price.toFixed(decimals);
};

/**
 * Calculate percentage difference between two numbers
 */
export const calculatePercentageDiff = (value1: number, value2: number): number => {
  return ((value1 - value2) / value2) * 100;
};
