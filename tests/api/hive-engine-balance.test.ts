/**
 * Tests for /api/hive-engine/balance route
 */

/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';

// Mock ALL imports from the route file before importing it
jest.mock('@/lib/hive-engine/tokens', () => ({
  getMedalsBalance: jest.fn(),
  getStakeInfo: jest.fn(),
  calculateEstimatedAPY: jest.fn(),
}));

jest.mock('@/lib/hive-engine/market', () => ({
  getMarketData: jest.fn(),
}));

jest.mock('@/lib/hive-engine/client', () => ({
  formatQuantity: jest.fn((n: number) => n.toFixed(3)),
  isValidAccountName: jest.fn((name: string) => {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 3 || name.length > 16) return false;
    return /^[a-z][a-z0-9.-]*[a-z0-9]$/.test(name);
  }),
}));

jest.mock('@/lib/hive-engine/constants', () => ({
  MEDALS_CONFIG: {
    SYMBOL: 'MEDALS',
    PRECISION: 3,
  },
  CACHE_TTLS: {
    BALANCE: 30,
  },
}));

// Import the route after mocks are set up
import { GET } from '@/app/api/hive-engine/balance/route';

const { getMedalsBalance, getStakeInfo } = jest.requireMock('@/lib/hive-engine/tokens');
const { getMarketData } = jest.requireMock('@/lib/hive-engine/market');

describe('GET /api/hive-engine/balance', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createRouteTestServer({
      routes: {
        'GET /api/hive-engine/balance': GET,
      },
    });
  });

  afterEach((done) => {
    if (server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  it('should return 400 when account parameter is missing', async () => {
    const response = await request(server).get('/api/hive-engine/balance');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Account parameter is required');
  });

  it('should return 400 for invalid account name', async () => {
    const response = await request(server)
      .get('/api/hive-engine/balance')
      .query({ account: 'ab' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid account name');
  });

  it('should return zero balance for user with no MEDALS', async () => {
    getMedalsBalance.mockResolvedValue(null);
    getStakeInfo.mockResolvedValue(null);
    getMarketData.mockResolvedValue(null);

    const response = await request(server)
      .get('/api/hive-engine/balance')
      .query({ account: 'testuser' });

    expect(response.status).toBe(200);
    expect(response.body.account).toBe('testuser');
    expect(response.body.liquid).toBe('0.000');
    expect(response.body.staked).toBe('0.000');
    expect(response.body.total).toBe('0.000');
    expect(response.body.premiumTier).toBeNull();
  });

  it('should return full balance data for user with MEDALS', async () => {
    const mockBalance = {
      liquid: 1000.5,
      staked: 5000,
      pendingUnstake: 100,
      delegatedIn: 200,
      delegatedOut: 50,
      total: 6250.5,
      premiumTier: 'SILVER',
    };

    const mockStakeInfo = {
      estimatedAPY: 10.5,
      unstakingCompleteTimestamp: '2025-02-01T00:00:00Z',
    };

    const mockMarketData = {
      priceHive: 0.05,
    };

    getMedalsBalance.mockResolvedValue(mockBalance);
    getStakeInfo.mockResolvedValue(mockStakeInfo);
    getMarketData.mockResolvedValue(mockMarketData);

    const response = await request(server)
      .get('/api/hive-engine/balance')
      .query({ account: 'testuser' });

    expect(response.status).toBe(200);
    expect(response.body.account).toBe('testuser');
    expect(response.body.liquid).toBe('1000.500');
    expect(response.body.staked).toBe('5000.000');
    expect(response.body.pendingUnstake).toBe('100.000');
    expect(response.body.delegatedIn).toBe('200.000');
    expect(response.body.delegatedOut).toBe('50.000');
    expect(response.body.total).toBe('6250.500');
    expect(response.body.premiumTier).toBe('SILVER');
    expect(response.body.estimatedAPY).toBe('10.50');
    expect(response.body.hiveValue).toBe('312.525'); // 6250.5 * 0.05
  });

  it('should handle errors gracefully', async () => {
    getMedalsBalance.mockRejectedValue(new Error('Network error'));

    const response = await request(server)
      .get('/api/hive-engine/balance')
      .query({ account: 'testuser' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to fetch balance');
    expect(response.body.message).toBe('Network error');
  });

  it('should set proper cache headers', async () => {
    getMedalsBalance.mockResolvedValue(null);
    getStakeInfo.mockResolvedValue(null);
    getMarketData.mockResolvedValue(null);

    const response = await request(server)
      .get('/api/hive-engine/balance')
      .query({ account: 'testuser' });

    expect(response.headers['cache-control']).toContain('s-maxage=30');
  });
});
