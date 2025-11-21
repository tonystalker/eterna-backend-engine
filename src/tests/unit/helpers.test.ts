import {
  generateOrderId,
  generateMockTxHash,
  calculateBackoff,
  formatPrice,
  calculatePercentageDiff,
  sleep,
} from '../../utils/helpers';

describe('Helper Functions', () => {
  describe('generateOrderId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateOrderId();
      const id2 = generateOrderId();

      expect(id1).not.toBe(id2);
    });

    it('should start with "ord_" prefix', () => {
      const id = generateOrderId();
      expect(id).toMatch(/^ord_/);
    });

    it('should include timestamp and random component', () => {
      const id = generateOrderId();
      const parts = id.split('_');

      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('ord');
      expect(parseInt(parts[1])).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });

  describe('generateMockTxHash', () => {
    it('should generate 64-character hex string', () => {
      const hash = generateMockTxHash();

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique hashes', () => {
      const hash1 = generateMockTxHash();
      const hash2 = generateMockTxHash();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      expect(calculateBackoff(0)).toBe(1000); // 2^0 * 1000
      expect(calculateBackoff(1)).toBe(2000); // 2^1 * 1000
      expect(calculateBackoff(2)).toBe(4000); // 2^2 * 1000
    });

    it('should cap at maximum delay', () => {
      expect(calculateBackoff(10)).toBe(10000); // Max 10 seconds
      expect(calculateBackoff(20)).toBe(10000); // Still capped
    });

    it('should use custom base delay', () => {
      expect(calculateBackoff(0, 500)).toBe(500);
      expect(calculateBackoff(1, 500)).toBe(1000);
      expect(calculateBackoff(2, 500)).toBe(2000);
    });
  });

  describe('formatPrice', () => {
    it('should format to default 6 decimals', () => {
      expect(formatPrice(100.123456789)).toBe('100.123457');
      expect(formatPrice(0.000001234)).toBe('0.000001');
    });

    it('should format to custom decimals', () => {
      expect(formatPrice(100.123456, 2)).toBe('100.12');
      expect(formatPrice(100.123456, 8)).toBe('100.12345600');
    });

    it('should handle whole numbers', () => {
      expect(formatPrice(100, 2)).toBe('100.00');
    });
  });

  describe('calculatePercentageDiff', () => {
    it('should calculate positive difference', () => {
      expect(calculatePercentageDiff(110, 100)).toBe(10);
    });

    it('should calculate negative difference', () => {
      expect(calculatePercentageDiff(90, 100)).toBe(-10);
    });

    it('should handle zero difference', () => {
      expect(calculatePercentageDiff(100, 100)).toBe(0);
    });

    it('should handle decimal values', () => {
      const diff = calculatePercentageDiff(102.5, 100);
      expect(diff).toBeCloseTo(2.5, 1);
    });
  });

  describe('sleep', () => {
    it('should delay for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(95); // Allow small margin
      expect(duration).toBeLessThan(150);
    });

    it('should return a promise', () => {
      const result = sleep(1);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
