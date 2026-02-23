/**
 * Rate Limiting Tests
 *
 * Tests the distributed rate limiting system including:
 * - In-memory fallback behavior
 * - Rate limit calculations
 * - Client identifier extraction
 * - Rate limit headers
 */

import {
  checkRateLimit,
  checkRateLimitSync,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMITS,
  isDistributedRateLimitingAvailable,
  resetRedisAvailability,
} from '@/lib/utils/rate-limit';

// Mock the Upstash modules to test fallback behavior
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest.fn().mockRejectedValue(new Error('Redis not available')),
  })),
}));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset Redis availability between tests
    resetRedisAvailability();
    // Clear environment variables
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  describe('checkRateLimitSync (in-memory)', () => {
    it('should allow requests within limit', () => {
      const config = { limit: 5, windowSeconds: 60 };
      const identifier = 'test-user-1';

      // First request should succeed
      const result1 = checkRateLimitSync(identifier, config);
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(4);

      // Second request should succeed
      const result2 = checkRateLimitSync(identifier, config);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(3);
    });

    it('should block requests exceeding limit', () => {
      const config = { limit: 3, windowSeconds: 60 };
      const identifier = 'test-user-2';

      // Use up the limit
      checkRateLimitSync(identifier, config);
      checkRateLimitSync(identifier, config);
      checkRateLimitSync(identifier, config);

      // Fourth request should fail
      const result = checkRateLimitSync(identifier, config);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track different identifiers separately', () => {
      const config = { limit: 2, windowSeconds: 60 };

      // User A uses their limit
      checkRateLimitSync('user-a', config);
      checkRateLimitSync('user-a', config);
      const resultA = checkRateLimitSync('user-a', config);
      expect(resultA.success).toBe(false);

      // User B should still have their limit
      const resultB = checkRateLimitSync('user-b', config);
      expect(resultB.success).toBe(true);
      expect(resultB.remaining).toBe(1);
    });

    it('should return reset time in the future', () => {
      const config = { limit: 5, windowSeconds: 60 };
      const result = checkRateLimitSync('test-user-3', config);

      expect(result.reset).toBeGreaterThan(Date.now());
      expect(result.reset).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });

  describe('checkRateLimit (async)', () => {
    it('should fall back to in-memory when Redis is not configured', async () => {
      const config = { limit: 5, windowSeconds: 60 };
      const identifier = 'async-test-user';

      const result = await checkRateLimit(identifier, config, 'test');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should work with different rate limit types', async () => {
      const identifier = 'type-test-user';

      const readResult = await checkRateLimit(identifier, RATE_LIMITS.read, 'read');
      expect(readResult.success).toBe(true);

      const writeResult = await checkRateLimit(identifier, RATE_LIMITS.write, 'write');
      expect(writeResult.success).toBe(true);
    });
  });

  describe('getClientIdentifier', () => {
    // Helper to create mock request with headers
    function createMockRequest(headers: Record<string, string> = {}): Request {
      return {
        headers: {
          get: (name: string) => headers[name.toLowerCase()] || null,
        },
      } as unknown as Request;
    }

    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.2',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.2');
    });

    it('should extract IP from x-vercel-forwarded-for header', () => {
      const request = createMockRequest({
        'x-vercel-forwarded-for': '192.168.1.3, 10.0.0.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.3');
    });

    it('should prioritize x-vercel-forwarded-for over other headers', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
        'x-vercel-forwarded-for': '192.168.1.3',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.3');
    });

    it('should return anonymous when no IP headers present', () => {
      const request = createMockRequest({});

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('anonymous');
    });

    it('should trim whitespace from IP addresses', () => {
      const request = createMockRequest({
        'x-forwarded-for': '  192.168.1.1  , 10.0.0.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('192.168.1.1');
    });
  });

  describe('createRateLimitHeaders', () => {
    it('should create correct headers', () => {
      const resetTime = Date.now() + 30000; // 30 seconds from now
      const headers = createRateLimitHeaders(5, resetTime, 10);

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('5');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should convert reset time to seconds', () => {
      const resetTime = 1700000000000; // A timestamp in ms
      const headers = createRateLimitHeaders(5, resetTime, 10);

      expect(headers['X-RateLimit-Reset']).toBe('1700000000');
    });
  });

  describe('RATE_LIMITS configuration', () => {
    it('should have read limits configured', () => {
      expect(RATE_LIMITS.read).toBeDefined();
      expect(RATE_LIMITS.read.limit).toBeGreaterThan(0);
      expect(RATE_LIMITS.read.windowSeconds).toBe(60);
    });

    it('should have write limits configured', () => {
      expect(RATE_LIMITS.write).toBeDefined();
      expect(RATE_LIMITS.write.limit).toBeGreaterThan(0);
      expect(RATE_LIMITS.write.windowSeconds).toBe(60);
    });

    it('should have auth limits configured', () => {
      expect(RATE_LIMITS.auth).toBeDefined();
      expect(RATE_LIMITS.auth.limit).toBe(20);
      expect(RATE_LIMITS.auth.windowSeconds).toBe(60);
    });

    it('should have realtime limits configured', () => {
      expect(RATE_LIMITS.realtime).toBeDefined();
      expect(RATE_LIMITS.realtime.limit).toBeGreaterThan(0);
      expect(RATE_LIMITS.realtime.windowSeconds).toBe(60);
    });

    it('should have stricter write limits than read limits', () => {
      expect(RATE_LIMITS.write.limit).toBeLessThan(RATE_LIMITS.read.limit);
    });
  });

  describe('isDistributedRateLimitingAvailable', () => {
    it('should return false when Redis is not configured', () => {
      resetRedisAvailability();
      expect(isDistributedRateLimitingAvailable()).toBe(false);
    });
  });
});
