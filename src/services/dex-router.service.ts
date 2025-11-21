import { DexQuote, DexName } from '../models/types';
import { DEX, DEX_CONFIG } from '../utils/constants';
import { sleep, generateMockTxHash, formatPrice } from '../utils/helpers';
import { logger } from '../utils/logger';

/**
 * Mock DEX Router Service
 * Simulates price fetching from Raydium and Meteora DEXs
 */
export class MockDexRouter {
  /**
   * Get quote from Raydium
   */
  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    // Simulate network delay
    await sleep(DEX_CONFIG.RAYDIUM.QUOTE_DELAY);

    // Calculate base price (simple mock: 1 SOL = ~100 USDC equivalent)
    const basePrice = this.calculateBasePrice(tokenIn, tokenOut, amount);

    // Add variance (98% - 102%)
    const variance =
      DEX_CONFIG.RAYDIUM.PRICE_VARIANCE_MIN +
      Math.random() *
        (DEX_CONFIG.RAYDIUM.PRICE_VARIANCE_MAX - DEX_CONFIG.RAYDIUM.PRICE_VARIANCE_MIN);

    const price = basePrice * variance;
    const fee = DEX_CONFIG.RAYDIUM.FEE;
    const effectivePrice = price * (1 - fee);

    const quote: DexQuote = {
      dex: DEX.RAYDIUM,
      price,
      fee,
      effectivePrice,
      timestamp: new Date(),
    };

    logger.debug(
      {
        dex: DEX.RAYDIUM,
        tokenIn,
        tokenOut,
        amount,
        price: formatPrice(price),
        effectivePrice: formatPrice(effectivePrice),
      },
      'Raydium quote fetched'
    );

    return quote;
  }

  /**
   * Get quote from Meteora
   */
  async getMeteoraQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    // Simulate network delay
    await sleep(DEX_CONFIG.METEORA.QUOTE_DELAY);

    // Calculate base price
    const basePrice = this.calculateBasePrice(tokenIn, tokenOut, amount);

    // Add variance (97% - 102%)
    const variance =
      DEX_CONFIG.METEORA.PRICE_VARIANCE_MIN +
      Math.random() *
        (DEX_CONFIG.METEORA.PRICE_VARIANCE_MAX - DEX_CONFIG.METEORA.PRICE_VARIANCE_MIN);

    const price = basePrice * variance;
    const fee = DEX_CONFIG.METEORA.FEE;
    const effectivePrice = price * (1 - fee);

    const quote: DexQuote = {
      dex: DEX.METEORA,
      price,
      fee,
      effectivePrice,
      timestamp: new Date(),
    };

    logger.debug(
      {
        dex: DEX.METEORA,
        tokenIn,
        tokenOut,
        amount,
        price: formatPrice(price),
        effectivePrice: formatPrice(effectivePrice),
      },
      'Meteora quote fetched'
    );

    return quote;
  }

  /**
   * Get quotes from both DEXs and select the best one
   */
  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<{ bestQuote: DexQuote; allQuotes: DexQuote[] }> {
    // Fetch quotes in parallel
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount),
    ]);

    const allQuotes = [raydiumQuote, meteoraQuote];

    // Select best quote (highest effective price = best for user)
    const bestQuote =
      raydiumQuote.effectivePrice > meteoraQuote.effectivePrice
        ? raydiumQuote
        : meteoraQuote;

    const priceDiff = Math.abs(
      ((raydiumQuote.effectivePrice - meteoraQuote.effectivePrice) /
        meteoraQuote.effectivePrice) *
        100
    );

    logger.info(
      {
        raydiumPrice: formatPrice(raydiumQuote.effectivePrice),
        meteoraPrice: formatPrice(meteoraQuote.effectivePrice),
        selectedDex: bestQuote.dex,
        priceDifference: formatPrice(priceDiff, 2) + '%',
      },
      '🔄 DEX Routing Decision'
    );

    return { bestQuote, allQuotes };
  }

  /**
   * Execute swap on selected DEX (mock implementation)
   */
  async executeSwap(
    dex: DexName,
    tokenIn: string,
    tokenOut: string,
    amount: number,
    expectedPrice: number,
    slippage: number
  ): Promise<{ txHash: string; executedPrice: number }> {
    // Simulate execution delay (2-3 seconds)
    const delay =
      DEX_CONFIG.EXECUTION_DELAY_MIN +
      Math.random() * (DEX_CONFIG.EXECUTION_DELAY_MAX - DEX_CONFIG.EXECUTION_DELAY_MIN);

    await sleep(delay);

    // Simulate slight slippage (±0.5% from expected price)
    const slippageVariance = -slippage / 2 + Math.random() * slippage;
    const executedPrice = expectedPrice * (1 + slippageVariance);

    // Generate mock transaction hash
    const txHash = generateMockTxHash();

    logger.info(
      {
        dex,
        tokenIn,
        tokenOut,
        amount,
        expectedPrice: formatPrice(expectedPrice),
        executedPrice: formatPrice(executedPrice),
        txHash,
        executionTime: `${Math.round(delay)}ms`,
      },
      '✅ Swap executed successfully'
    );

    return { txHash, executedPrice };
  }

  /**
   * Calculate base price for token pair (mock implementation)
   * In production, this would fetch real market data
   */
  private calculateBasePrice(tokenIn: string, tokenOut: string, amount: number): number {
    // Simple mock pricing logic
    const priceMap: Record<string, number> = {
      'SOL/USDC': 100.0,
      'USDC/SOL': 0.01,
      'SOL/USDT': 100.0,
      'USDT/SOL': 0.01,
      'BONK/SOL': 0.00001,
      'SOL/BONK': 100000,
    };

    const pair = `${tokenIn}/${tokenOut}`;
    const baseRate = priceMap[pair] || 1.0;

    // Return total output amount for input
    return amount * baseRate;
  }
}

// Export singleton instance
export const dexRouter = new MockDexRouter();
