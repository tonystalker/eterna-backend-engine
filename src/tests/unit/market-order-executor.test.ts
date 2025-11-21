import { MarketOrderExecutor } from '../../executors/market-order.executor';
import { Order, OrderStatusUpdate } from '../../models/types';
import { ORDER_STATUS, ORDER_TYPE } from '../../utils/constants';

// Mock DEX router
jest.mock('../../services/dex-router.service', () => ({
  dexRouter: {
    getBestQuote: jest.fn().mockResolvedValue({
      bestQuote: {
        dex: 'Raydium',
        price: 100,
        fee: 0.003,
        effectivePrice: 99.7,
        timestamp: new Date(),
      },
      allQuotes: [
        {
          dex: 'Raydium',
          price: 100,
          fee: 0.003,
          effectivePrice: 99.7,
          timestamp: new Date(),
        },
        {
          dex: 'Meteora',
          price: 99.5,
          fee: 0.002,
          effectivePrice: 99.3,
          timestamp: new Date(),
        },
      ],
    }),
    executeSwap: jest.fn().mockResolvedValue({
      txHash: 'mock_tx_hash_12345',
      executedPrice: 99.65,
    }),
  },
}));

describe('MarketOrderExecutor', () => {
  let executor: MarketOrderExecutor;
  let mockOrder: Order;
  let statusUpdates: OrderStatusUpdate[];
  let statusCallback: jest.Mock;

  beforeEach(() => {
    executor = new MarketOrderExecutor();
    statusUpdates = [];
    statusCallback = jest.fn((update: OrderStatusUpdate) => {
      statusUpdates.push(update);
      return Promise.resolve();
    });

    mockOrder = {
      orderId: 'test_order_123',
      orderType: ORDER_TYPE.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amount: 1.5,
      slippage: 0.01,
      status: ORDER_STATUS.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('validate', () => {
    it('should validate a correct order', () => {
      expect(() => executor.validate(mockOrder)).not.toThrow();
    });

    it('should throw error if tokenIn is missing', () => {
      mockOrder.tokenIn = '';
      expect(() => executor.validate(mockOrder)).toThrow('Token pair is required');
    });

    it('should throw error if tokenOut is missing', () => {
      mockOrder.tokenOut = '';
      expect(() => executor.validate(mockOrder)).toThrow('Token pair is required');
    });

    it('should throw error if tokenIn equals tokenOut', () => {
      mockOrder.tokenIn = 'SOL';
      mockOrder.tokenOut = 'SOL';
      expect(() => executor.validate(mockOrder)).toThrow('Cannot swap same token');
    });

    it('should throw error if amount is zero', () => {
      mockOrder.amount = 0;
      expect(() => executor.validate(mockOrder)).toThrow('Amount must be positive');
    });

    it('should throw error if amount is negative', () => {
      mockOrder.amount = -1;
      expect(() => executor.validate(mockOrder)).toThrow('Amount must be positive');
    });

    it('should throw error if slippage is negative', () => {
      mockOrder.slippage = -0.01;
      expect(() => executor.validate(mockOrder)).toThrow(
        'Slippage must be between 0% and 10%'
      );
    });

    it('should throw error if slippage exceeds 10%', () => {
      mockOrder.slippage = 0.11;
      expect(() => executor.validate(mockOrder)).toThrow(
        'Slippage must be between 0% and 10%'
      );
    });
  });

  describe('execute', () => {
    it('should execute order successfully and emit all status updates', async () => {
      const result = await executor.execute(mockOrder, statusCallback);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('mock_tx_hash_12345');
      expect(result.executedPrice).toBe(99.65);

      // Should emit status updates: routing, routing_complete, building, submitted, confirmed
      expect(statusUpdates.length).toBeGreaterThanOrEqual(4);

      // Check status progression
      const statuses = statusUpdates.map((u) => u.status);
      expect(statuses).toContain(ORDER_STATUS.ROUTING);
      expect(statuses).toContain(ORDER_STATUS.BUILDING);
      expect(statuses).toContain(ORDER_STATUS.SUBMITTED);
      expect(statuses).toContain(ORDER_STATUS.CONFIRMED);
    }, 15000);

    it('should emit routing status with selected DEX', async () => {
      await executor.execute(mockOrder, statusCallback);

      const routingUpdate = statusUpdates.find((u) => u.data?.selectedDex);
      expect(routingUpdate).toBeDefined();
      expect(routingUpdate!.data?.selectedDex).toBe('Raydium');
      expect(routingUpdate!.data?.reason).toContain('Better price');
    }, 15000);

    it('should emit confirmed status with transaction details', async () => {
      await executor.execute(mockOrder, statusCallback);

      const confirmedUpdate = statusUpdates.find((u) => u.status === ORDER_STATUS.CONFIRMED);
      expect(confirmedUpdate).toBeDefined();
      expect(confirmedUpdate!.data?.txHash).toBe('mock_tx_hash_12345');
      expect(confirmedUpdate!.data?.executedPrice).toBe(99.65);
    }, 15000);

    it('should return failure on validation error', async () => {
      mockOrder.amount = -1;

      const result = await executor.execute(mockOrder, statusCallback);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount must be positive');

      // Should emit failed status
      const failedUpdate = statusUpdates.find((u) => u.status === ORDER_STATUS.FAILED);
      expect(failedUpdate).toBeDefined();
    });

    it('should handle DEX routing failure', async () => {
      const { dexRouter } = require('../../services/dex-router.service');
      dexRouter.getBestQuote.mockRejectedValueOnce(new Error('DEX unavailable'));

      const result = await executor.execute(mockOrder, statusCallback);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DEX unavailable');
    });

    it('should handle swap execution failure', async () => {
      const { dexRouter } = require('../../services/dex-router.service');
      dexRouter.executeSwap.mockRejectedValueOnce(new Error('Insufficient liquidity'));

      const result = await executor.execute(mockOrder, statusCallback);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient liquidity');
    });

    it('should call status callback for each state transition', async () => {
      await executor.execute(mockOrder, statusCallback);

      expect(statusCallback).toHaveBeenCalledTimes(statusUpdates.length);
      expect(statusCallback.mock.calls.every((call) => call[0].orderId === mockOrder.orderId)).toBe(true);
    }, 15000);
  });
});
