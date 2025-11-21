import { IOrderExecutor } from './order-executor.interface';
import { Order, ExecutionResult, OrderStatusUpdate } from '../models/types';
import { ORDER_STATUS } from '../utils/constants';
import { dexRouter } from '../services/dex-router.service';
import { logger } from '../utils/logger';
import { sleep } from '../utils/helpers';

/**
 * Market Order Executor
 * Executes market orders at the current best price
 * 
 * Market orders are executed immediately by:
 * 1. Fetching quotes from all DEXs
 * 2. Selecting the best price
 * 3. Executing the swap
 * 
 * Extension for other order types:
 * - Limit Orders: Add price monitoring loop that checks current price
 *   against target price before executing
 * - Sniper Orders: Subscribe to token launch events (via Solana program
 *   subscriptions) and trigger execution on liquidity pool creation
 */
export class MarketOrderExecutor implements IOrderExecutor {
  /**
   * Execute market order
   */
  async execute(
    order: Order,
    statusCallback: (update: OrderStatusUpdate) => Promise<void>
  ): Promise<ExecutionResult> {
    try {
      // Validate order
      this.validate(order);

      logger.info({ orderId: order.orderId }, 'Starting market order execution');

      // Step 1: ROUTING - Compare DEX prices
      await statusCallback({
        orderId: order.orderId,
        status: ORDER_STATUS.ROUTING,
        timestamp: new Date(),
        data: {},
      });

      // Add delay to see WebSocket message
      await sleep(1000);

      const { bestQuote, allQuotes } = await dexRouter.getBestQuote(
        order.tokenIn,
        order.tokenOut,
        order.amount
      );

      // Emit routing complete with selection reason
      const otherQuote = allQuotes.find((q) => q.dex !== bestQuote.dex);
      const priceDiff = otherQuote
        ? ((bestQuote.effectivePrice - otherQuote.effectivePrice) / otherQuote.effectivePrice) *
          100
        : 0;

      await statusCallback({
        orderId: order.orderId,
        status: ORDER_STATUS.ROUTING,
        timestamp: new Date(),
        data: {
          selectedDex: bestQuote.dex,
          reason: `Better price: ${bestQuote.effectivePrice.toFixed(6)} vs ${otherQuote?.effectivePrice.toFixed(6)} (${priceDiff.toFixed(2)}% better)`,
          quotes: allQuotes,
        },
      });

      // Add delay to see WebSocket message
      await sleep(3000); // Increased to 3 seconds

      // Step 2: BUILDING - Prepare transaction
      await statusCallback({
        orderId: order.orderId,
        status: ORDER_STATUS.BUILDING,
        timestamp: new Date(),
        data: { selectedDex: bestQuote.dex },
      });

      // Simulate transaction building with delay
      await sleep(3000); // Increased to 3 seconds

      // Step 3: SUBMITTED - Execute swap
      await statusCallback({
        orderId: order.orderId,
        status: ORDER_STATUS.SUBMITTED,
        timestamp: new Date(),
        data: { selectedDex: bestQuote.dex },
      });

      // Add delay before executing swap
      await sleep(2000); // Increased to 2 seconds

      const { txHash, executedPrice } = await dexRouter.executeSwap(
        bestQuote.dex,
        order.tokenIn,
        order.tokenOut,
        order.amount,
        bestQuote.effectivePrice,
        order.slippage
      );

      // Add delay before confirmation
      await sleep(2000); // Increased to 2 seconds

      // Step 4: CONFIRMED - Transaction successful
      await statusCallback({
        orderId: order.orderId,
        status: ORDER_STATUS.CONFIRMED,
        timestamp: new Date(),
        data: {
          selectedDex: bestQuote.dex,
          txHash,
          executedPrice,
        },
      });

      logger.info(
        {
          orderId: order.orderId,
          txHash,
          executedPrice,
          selectedDex: bestQuote.dex,
        },
        'Market order executed successfully'
      );

      return {
        success: true,
        txHash,
        executedPrice,
      };
    } catch (error) {
      logger.error({ error, orderId: order.orderId }, 'Market order execution failed');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await statusCallback({
        orderId: order.orderId,
        status: ORDER_STATUS.FAILED,
        timestamp: new Date(),
        data: {
          error: errorMessage,
        },
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate market order
   */
  validate(order: Order): boolean {
    if (!order.tokenIn || !order.tokenOut) {
      throw new Error('Token pair is required');
    }

    if (order.tokenIn === order.tokenOut) {
      throw new Error('Cannot swap same token');
    }

    if (order.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (order.slippage < 0 || order.slippage > 0.1) {
      throw new Error('Slippage must be between 0% and 10%');
    }

    return true;
  }
}
