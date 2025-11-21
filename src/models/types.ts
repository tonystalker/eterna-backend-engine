import { ORDER_STATUS, ORDER_TYPE, DEX } from '../utils/constants';

/**
 * Order Status Enum
 */
export type OrderStatus =
  (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Order Type Enum
 */
export type OrderType = (typeof ORDER_TYPE)[keyof typeof ORDER_TYPE];

/**
 * DEX Name Type
 */
export type DexName = (typeof DEX)[keyof typeof DEX];

/**
 * Order Creation Request
 */
export interface CreateOrderRequest {
  tokenIn: string;
  tokenOut: string;
  amount: number;
  slippage?: number; // Optional, defaults to 1%
  orderType?: OrderType; // Optional, defaults to 'market'
}

/**
 * Order Entity
 */
export interface Order {
  orderId: string;
  orderType: OrderType;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  slippage: number;
  status: OrderStatus;
  selectedDex?: DexName;
  executedPrice?: number;
  txHash?: string;
  error?: string;
  attempts?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DEX Quote Response
 */
export interface DexQuote {
  dex: DexName;
  price: number;
  fee: number;
  effectivePrice: number; // price after fees
  timestamp: Date;
}

/**
 * Execution Result
 */
export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  executedPrice?: number;
  error?: string;
}

/**
 * Order Status Update Event
 */
export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  timestamp: Date;
  data?: {
    selectedDex?: DexName;
    txHash?: string;
    executedPrice?: number;
    error?: string;
    reason?: string;
    quotes?: DexQuote[];
  };
}

/**
 * Queue Job Data
 */
export interface OrderJobData {
  orderId: string;
  order: Order;
}
