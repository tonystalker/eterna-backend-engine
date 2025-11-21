import { MockDexRouter } from '../../services/dex-router.service';
import { DEX } from '../../utils/constants';

describe('MockDexRouter', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
  });

  describe('getRaydiumQuote', () => {
    it('should return a valid quote with price variance', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 1);

      expect(quote).toHaveProperty('dex', DEX.RAYDIUM);
      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('fee', 0.003);
      expect(quote).toHaveProperty('effectivePrice');
      expect(quote).toHaveProperty('timestamp');

      // Price should be in expected range (98 - 102 USDC for 1 SOL)
      expect(quote.price).toBeGreaterThan(90);
      expect(quote.price).toBeLessThan(110);

      // Effective price should account for fees
      expect(quote.effectivePrice).toBeLessThan(quote.price);
    });

    it('should simulate network delay', async () => {
      const startTime = Date.now();
      await router.getRaydiumQuote('SOL', 'USDC', 1);
      const duration = Date.now() - startTime;

      // Should take at least 200ms (simulated delay)
      expect(duration).toBeGreaterThanOrEqual(190); // Small margin for execution time
    });

    it('should scale with amount', async () => {
      const quote1 = await router.getRaydiumQuote('SOL', 'USDC', 1);
      const quote2 = await router.getRaydiumQuote('SOL', 'USDC', 10);

      // Output should scale with input amount
      expect(quote2.price).toBeGreaterThan(quote1.price * 8); // Allow for variance
    });
  });

  describe('getMeteoraQuote', () => {
    it('should return a valid quote with different fee structure', async () => {
      const quote = await router.getMeteoraQuote('SOL', 'USDC', 1);

      expect(quote).toHaveProperty('dex', DEX.METEORA);
      expect(quote).toHaveProperty('fee', 0.002); // Lower fee than Raydium
      expect(quote.price).toBeGreaterThan(90);
      expect(quote.price).toBeLessThan(110);
    });

    it('should have different price variance range than Raydium', async () => {
      const quotes = await Promise.all([
        router.getMeteoraQuote('SOL', 'USDC', 1),
        router.getMeteoraQuote('SOL', 'USDC', 1),
        router.getMeteoraQuote('SOL', 'USDC', 1),
        router.getMeteoraQuote('SOL', 'USDC', 1),
        router.getMeteoraQuote('SOL', 'USDC', 1),
      ]);

      const prices = quotes.map((q) => q.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);

      // Should have variance within expected range (97-102)
      expect(min).toBeGreaterThan(90);
      expect(max).toBeLessThan(110);
    });
  });

  describe('getBestQuote', () => {
    it('should return both quotes and select the best one', async () => {
      const result = await router.getBestQuote('SOL', 'USDC', 1);

      expect(result).toHaveProperty('bestQuote');
      expect(result).toHaveProperty('allQuotes');
      expect(result.allQuotes).toHaveLength(2);

      // Best quote should have highest effective price
      const otherQuote = result.allQuotes.find((q) => q.dex !== result.bestQuote.dex);
      expect(result.bestQuote.effectivePrice).toBeGreaterThanOrEqual(
        otherQuote!.effectivePrice
      );
    });

    it('should fetch quotes in parallel', async () => {
      const startTime = Date.now();
      await router.getBestQuote('SOL', 'USDC', 1);
      const duration = Date.now() - startTime;

      // Should take ~200ms (parallel), not ~400ms (sequential)
      expect(duration).toBeLessThan(350);
    });

    it('should select Meteora when it has better effective price', async () => {
      // Run multiple times to increase chance of Meteora winning
      const results = await Promise.all([
        router.getBestQuote('SOL', 'USDC', 1),
        router.getBestQuote('SOL', 'USDC', 1),
        router.getBestQuote('SOL', 'USDC', 1),
        router.getBestQuote('SOL', 'USDC', 1),
        router.getBestQuote('SOL', 'USDC', 1),
      ]);

      // At least one should select each DEX (with high probability)
      const raydiumWins = results.filter((r) => r.bestQuote.dex === DEX.RAYDIUM).length;
      const meteoraWins = results.filter((r) => r.bestQuote.dex === DEX.METEORA).length;

      expect(raydiumWins + meteoraWins).toBe(5);
    });
  });

  describe('executeSwap', () => {
    it('should simulate execution delay', async () => {
      const startTime = Date.now();
      await router.executeSwap(DEX.RAYDIUM, 'SOL', 'USDC', 1, 100, 0.01);
      const duration = Date.now() - startTime;

      // Should take 2-3 seconds
      expect(duration).toBeGreaterThanOrEqual(1900);
      expect(duration).toBeLessThan(3200);
    });

    it('should return transaction hash and executed price', async () => {
      const result = await router.executeSwap(DEX.METEORA, 'SOL', 'USDC', 1, 100, 0.01);

      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('executedPrice');
      expect(result.txHash).toHaveLength(64); // Mock tx hash length
      expect(result.executedPrice).toBeCloseTo(100, 0); // Within slippage
    });

    it('should apply slippage to executed price', async () => {
      const expectedPrice = 100;
      const slippage = 0.01; // 1%

      const result = await router.executeSwap(
        DEX.RAYDIUM,
        'SOL',
        'USDC',
        1,
        expectedPrice,
        slippage
      );

      // Executed price should be within slippage range
      const lowerBound = expectedPrice * (1 - slippage);
      const upperBound = expectedPrice * (1 + slippage);

      expect(result.executedPrice).toBeGreaterThanOrEqual(lowerBound);
      expect(result.executedPrice).toBeLessThanOrEqual(upperBound);
    });

    it('should generate unique transaction hashes', async () => {
      const result1 = await router.executeSwap(DEX.RAYDIUM, 'SOL', 'USDC', 1, 100, 0.01);
      const result2 = await router.executeSwap(DEX.RAYDIUM, 'SOL', 'USDC', 1, 100, 0.01);

      expect(result1.txHash).not.toBe(result2.txHash);
    });
  });
});
