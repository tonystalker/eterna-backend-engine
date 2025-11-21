import { Order, ExecutionResult, OrderStatusUpdate } from '../models/types';

/**
 * Order Executor Interface
 * Defines the contract for all order type executors
 */
export interface IOrderExecutor {
  /**
   * Execute the order
   * @param order - The order to execute
   * @param statusCallback - Callback to emit status updates
   * @returns Promise<ExecutionResult>
   */
  execute(
    order: Order,
    statusCallback: (update: OrderStatusUpdate) => Promise<void>
  ): Promise<ExecutionResult>;

  /**
   * Validate order parameters
   * @param order - The order to validate
   * @returns true if valid, throws error otherwise
   */
  validate(order: Order): boolean;
}
