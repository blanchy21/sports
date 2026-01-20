/**
 * Hive Engine Client Tests
 *
 * Tests for the Hive Engine RPC client functionality.
 */

import {
  HiveEngineClient,
  getHiveEngineClient,
  resetHiveEngineClient,
  formatQuantity,
  parseQuantity,
  isValidAccountName,
  isValidQuantity,
} from '@/lib/hive-engine/client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('HiveEngineClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHiveEngineClient();
  });

  describe('formatQuantity', () => {
    it('should format number with default precision (6 decimals for MEDALS)', () => {
      expect(formatQuantity(100)).toBe('100.000000');
      expect(formatQuantity(0.1)).toBe('0.100000');
      expect(formatQuantity(1234.5678)).toBe('1234.567800');
    });

    it('should format with custom precision', () => {
      expect(formatQuantity(100, 2)).toBe('100.00');
      expect(formatQuantity(100, 8)).toBe('100.00000000');
    });

    it('should handle zero', () => {
      expect(formatQuantity(0)).toBe('0.000000');
    });
  });

  describe('parseQuantity', () => {
    it('should parse valid quantity strings', () => {
      expect(parseQuantity('100.000')).toBe(100);
      expect(parseQuantity('0.123')).toBe(0.123);
      expect(parseQuantity('1234567.890')).toBe(1234567.89);
    });

    it('should return 0 for invalid strings', () => {
      expect(parseQuantity('')).toBe(0);
      expect(parseQuantity('abc')).toBe(0);
      expect(parseQuantity('NaN')).toBe(0);
    });

    it('should handle integer strings', () => {
      expect(parseQuantity('100')).toBe(100);
    });
  });

  describe('isValidAccountName', () => {
    it('should validate correct account names', () => {
      expect(isValidAccountName('alice')).toBe(true);
      expect(isValidAccountName('bob123')).toBe(true);
      expect(isValidAccountName('test-user')).toBe(true);
      expect(isValidAccountName('my.account')).toBe(true);
      expect(isValidAccountName('sportsblock')).toBe(true);
    });

    it('should reject invalid account names', () => {
      expect(isValidAccountName('')).toBe(false);
      expect(isValidAccountName('ab')).toBe(false); // Too short
      expect(isValidAccountName('a'.repeat(17))).toBe(false); // Too long
      expect(isValidAccountName('123abc')).toBe(false); // Starts with number
      expect(isValidAccountName('ABC')).toBe(false); // Uppercase
      expect(isValidAccountName('test_user')).toBe(false); // Underscore
      expect(isValidAccountName('test..user')).toBe(false); // Double dot
      expect(isValidAccountName('test--user')).toBe(false); // Double dash
    });

    it('should reject null/undefined', () => {
      expect(isValidAccountName(null as unknown as string)).toBe(false);
      expect(isValidAccountName(undefined as unknown as string)).toBe(false);
    });
  });

  describe('isValidQuantity', () => {
    it('should validate correct quantities', () => {
      expect(isValidQuantity('100.000')).toBe(true);
      expect(isValidQuantity('0.001')).toBe(true);
      expect(isValidQuantity('1')).toBe(true);
      expect(isValidQuantity('1234567.123')).toBe(true);
    });

    it('should reject invalid quantities', () => {
      expect(isValidQuantity('')).toBe(false);
      expect(isValidQuantity('0')).toBe(false); // Must be > 0
      expect(isValidQuantity('-100')).toBe(false);
      expect(isValidQuantity('100.1234567')).toBe(false); // Too many decimals (>6)
      expect(isValidQuantity('abc')).toBe(false);
    });

    it('should respect custom precision', () => {
      expect(isValidQuantity('100.12345678', 8)).toBe(true);
      expect(isValidQuantity('100.123456789', 8)).toBe(false);
    });
  });

  describe('HiveEngineClient.find', () => {
    it('should make RPC call and return results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: [
              { account: 'alice', symbol: 'MEDALS', balance: '100.000' },
              { account: 'bob', symbol: 'MEDALS', balance: '200.000' },
            ],
          }),
      });

      const client = new HiveEngineClient();
      const result = await client.find<{ account: string; symbol: string; balance: string }>(
        'tokens',
        'balances',
        { symbol: 'MEDALS' }
      );

      expect(result).toHaveLength(2);
      expect(result[0].account).toBe('alice');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: null,
          }),
      });

      const client = new HiveEngineClient();
      const result = await client.find('tokens', 'balances', { symbol: 'NONEXISTENT' });

      expect(result).toEqual([]);
    });

    it('should retry on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 2,
              result: [{ account: 'alice' }],
            }),
        });

      const client = new HiveEngineClient({ retryDelay: 10 });
      const result = await client.find('tokens', 'balances', {});

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = new HiveEngineClient({ maxRetries: 2, retryDelay: 10 });

      await expect(client.find('tokens', 'balances', {})).rejects.toThrow('Network error');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('HiveEngineClient.findOne', () => {
    it('should return single result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: { account: 'alice', symbol: 'MEDALS', balance: '100.000' },
          }),
      });

      const client = new HiveEngineClient();
      const result = await client.findOne<{ account: string; symbol: string; balance: string }>(
        'tokens',
        'balances',
        {
          account: 'alice',
          symbol: 'MEDALS',
        }
      );

      expect(result).not.toBeNull();
      expect(result?.account).toBe('alice');
    });

    it('should return null when not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: null,
          }),
      });

      const client = new HiveEngineClient();
      const result = await client.findOne('tokens', 'balances', {
        account: 'nonexistent',
      });

      expect(result).toBeNull();
    });
  });

  describe('getHiveEngineClient (singleton)', () => {
    it('should return the same instance', () => {
      const client1 = getHiveEngineClient();
      const client2 = getHiveEngineClient();

      expect(client1).toBe(client2);
    });

    it('should create new instance after reset', () => {
      const client1 = getHiveEngineClient();
      resetHiveEngineClient();
      const client2 = getHiveEngineClient();

      expect(client1).not.toBe(client2);
    });
  });

  describe('node failover', () => {
    it('should switch to next node on failure', async () => {
      const urls: string[] = [];

      mockFetch.mockImplementation((url) => {
        urls.push(url as string);
        if (urls.length === 1) {
          return Promise.reject(new Error('First node failed'));
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: '2.0',
              id: 1,
              result: [{ account: 'test' }],
            }),
        });
      });

      const client = new HiveEngineClient({ retryDelay: 10 });
      await client.find('tokens', 'balances', {});

      // Should have tried two different nodes
      expect(urls.length).toBe(2);
      expect(urls[0]).not.toBe(urls[1]);
    });
  });
});
