import { IOrderExecutor } from './order-executor.interface';
import { MarketOrderExecutor } from './market-order.executor';
import { OrderType } from '../models/types';
import { ORDER_TYPE } from '../utils/constants';

/**
 * Factory for creating order executors based on order type
 */
export class OrderExecutorFactory {
  /**
   * Get executor for given order type
   */
  static getExecutor(orderType: OrderType): IOrderExecutor {
    switch (orderType) {
      case ORDER_TYPE.MARKET:
        return new MarketOrderExecutor();

      case ORDER_TYPE.LIMIT:
        // TODO: Implement LimitOrderExecutor
        // Would require price monitoring service and conditional execution
        throw new Error('Limit orders not yet implemented');

      case ORDER_TYPE.SNIPER:
        // TODO: Implement SniperOrderExecutor
        // Would require token launch detection via Solana subscriptions
        throw new Error('Sniper orders not yet implemented');

      default:
        throw new Error(`Unknown order type: ${orderType}`);
    }
  }
}
