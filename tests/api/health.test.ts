/**
 * Health Endpoint Tests
 *
 * Tests the /api/health endpoint functionality
 * Note: These tests mock external dependencies to focus on logic testing
 */

// Mock Next.js server
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(data),
    }),
  },
}));

// Mock the cache module
const mockIsRedisAvailable = jest.fn().mockReturnValue(false);
jest.mock('@/lib/cache', () => ({
  getTieredCache: jest.fn().mockResolvedValue({
    isRedisAvailable: mockIsRedisAvailable,
  }),
}));

const mockIsRedisConfigured = jest.fn().mockReturnValue(false);
jest.mock('@/lib/cache/redis-cache', () => ({
  isRedisConfigured: mockIsRedisConfigured,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { GET } from '@/app/api/health/route';

describe('/api/health endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRedisAvailable.mockReturnValue(false);
    mockIsRedisConfigured.mockReturnValue(false);
  });

  describe('GET request', () => {
    it('should return healthy status when all services are up', async () => {
      // Configure Redis as available for healthy status
      mockIsRedisConfigured.mockReturnValue(true);
      mockIsRedisAvailable.mockReturnValue(true);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks.service.status).toBe('pass');
      expect(data.checks.redis.status).toBe('pass');
      expect(data.checks.hive.status).toBe('pass');
      expect(data.timestamp).toBeDefined();
    });

    it('should return degraded status when Redis not configured but Hive is up', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.checks.service.status).toBe('pass');
      expect(data.checks.redis.status).toBe('warn');
      expect(data.checks.hive.status).toBe('pass');
    });

    it('should include uptime in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBeDefined();
      expect(typeof data.uptime).toBe('number');
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should show Redis as warn when not configured', async () => {
      mockIsRedisConfigured.mockReturnValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.checks.redis.status).toBe('warn');
      expect(data.checks.redis.message).toContain('not configured');
    });

    it('should return unhealthy status when Hive API returns non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.hive.status).toBe('fail');
    });

    it('should return unhealthy status when Hive API returns error in body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          error: { message: 'Internal error' },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.hive.status).toBe('fail');
    });

    it('should handle Hive API network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.hive.status).toBe('fail');
      expect(data.checks.hive.latency).toBeDefined();
    });

    it('should include version information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.version).toBeDefined();
    });

    it('should include latency metrics for Hive check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.checks.hive.latency).toBeDefined();
      expect(typeof data.checks.hive.latency).toBe('number');
    });

    it('should show Redis as pass when configured and connected', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockIsRedisAvailable.mockReturnValue(true);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.checks.redis.status).toBe('pass');
    });

    it('should show Redis as warn when configured but not connected', async () => {
      mockIsRedisConfigured.mockReturnValue(true);
      mockIsRedisAvailable.mockReturnValue(false);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.checks.redis.status).toBe('warn');
    });

    it('should include block info in successful Hive check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      // Should mention "connected" and include block number
      expect(data.checks.hive.message).toMatch(/connected|block/i);
    });

    it('should return all check types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          result: { head_block_number: 12345678 },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.checks).toHaveProperty('service');
      expect(data.checks).toHaveProperty('redis');
      expect(data.checks).toHaveProperty('hive');
    });
  });
});
