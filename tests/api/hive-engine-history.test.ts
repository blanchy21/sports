/**
 * Tests for /api/hive-engine/history route
 */

/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';
import { GET } from '@/app/api/hive-engine/history/route';

// Mock the hive-engine modules
jest.mock('@/lib/hive-engine/history', () => ({
  getTransferHistory: jest.fn(),
  getStakingHistory: jest.fn(),
  getRewardsReceived: jest.fn(),
  getRecentActivity: jest.fn(),
  getAccountStats: jest.fn(),
}));

jest.mock('@/lib/hive-engine/client', () => ({
  isValidAccountName: jest.fn((name: string) => {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 3 || name.length > 16) return false;
    return /^[a-z][a-z0-9.-]*[a-z0-9]$/.test(name);
  }),
  parseQuantity: jest.fn((q: string) => parseFloat(q)),
}));

jest.mock('@/lib/hive-engine/constants', () => ({
  MEDALS_CONFIG: {
    SYMBOL: 'MEDALS',
    PRECISION: 3,
  },
  CACHE_TTLS: {
    HISTORY: 120,
  },
}));

const {
  getTransferHistory,
  getStakingHistory,
  getRewardsReceived,
  getRecentActivity,
  getAccountStats,
} = jest.requireMock('@/lib/hive-engine/history');

describe('GET /api/hive-engine/history', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createRouteTestServer({
      routes: {
        'GET /api/hive-engine/history': GET,
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
    const response = await request(server).get('/api/hive-engine/history');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Account parameter is required');
  });

  it('should return 400 for invalid account name', async () => {
    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'ab' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid account name');
  });

  it('should return 400 for invalid type', async () => {
    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid type');
  });

  it('should return transfers history', async () => {
    const mockTransfers = [
      { from: 'alice', to: 'testuser', quantity: '100.000', memo: 'payment', timestamp: 1700000000 },
      { from: 'testuser', to: 'bob', quantity: '50.000', memo: '', timestamp: 1700000100 },
    ];

    getTransferHistory.mockResolvedValue(mockTransfers);

    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'transfers' });

    expect(response.status).toBe(200);
    expect(response.body.account).toBe('testuser');
    expect(response.body.type).toBe('transfers');
    expect(response.body.count).toBe(2);
    expect(response.body.transactions).toHaveLength(2);
    expect(response.body.transactions[0].direction).toBe('in');
    expect(response.body.transactions[1].direction).toBe('out');
  });

  it('should return staking history', async () => {
    const mockStaking = [
      { action: 'stake', quantity: '100.000', to: 'testuser', from: null, timestamp: 1700000000 },
      { action: 'unstake', quantity: '50.000', to: null, from: 'testuser', timestamp: 1700000100 },
    ];

    getStakingHistory.mockResolvedValue(mockStaking);

    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'staking' });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('staking');
    expect(response.body.count).toBe(2);
    expect(response.body.transactions[0].action).toBe('stake');
    expect(response.body.transactions[1].action).toBe('unstake');
  });

  it('should return rewards history with summary', async () => {
    const mockRewards = [
      { type: 'staking', amount: 10, from: 'sportsblock', memo: 'weekly', timestamp: new Date() },
      { type: 'curator', amount: 5, from: 'curator1', memo: '', timestamp: new Date() },
      { type: 'content', amount: 100, from: 'sportsblock', memo: 'post of week', timestamp: new Date() },
    ];

    getRewardsReceived.mockResolvedValue(mockRewards);

    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'rewards' });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('rewards');
    expect(response.body.summary.staking).toBe('10.000');
    expect(response.body.summary.curator).toBe('5.000');
    expect(response.body.summary.content).toBe('100.000');
    expect(response.body.summary.total).toBe('115.000');
    expect(response.body.transactions).toHaveLength(3);
  });

  it('should return activity history', async () => {
    const mockActivity = [
      { type: 'transfer_in', amount: 100, counterparty: 'alice', memo: 'payment', timestamp: new Date() },
      { type: 'stake', amount: 50, counterparty: null, memo: '', timestamp: new Date() },
    ];

    getRecentActivity.mockResolvedValue(mockActivity);

    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'activity' });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('activity');
    expect(response.body.count).toBe(2);
    expect(response.body.transactions[0].type).toBe('transfer_in');
  });

  it('should return all history types with stats', async () => {
    const mockTransfers = [
      { from: 'alice', to: 'testuser', quantity: '100.000', memo: '', timestamp: 1700000000 },
    ];
    const mockStaking = [
      { action: 'stake', quantity: '100.000', to: 'testuser', from: null, timestamp: 1700000000 },
    ];
    const mockRewards = [
      { type: 'staking', amount: 10, from: 'sportsblock', memo: '', timestamp: new Date() },
    ];
    const mockStats = {
      totalReceived: 1000,
      totalSent: 500,
      transferCount: 25,
      uniqueCounterparties: 10,
      firstActivity: new Date('2024-01-01'),
      lastActivity: new Date('2024-12-01'),
    };

    getTransferHistory.mockResolvedValue(mockTransfers);
    getStakingHistory.mockResolvedValue(mockStaking);
    getRewardsReceived.mockResolvedValue(mockRewards);
    getAccountStats.mockResolvedValue(mockStats);

    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'all' });

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('all');
    expect(response.body.stats.totalReceived).toBe('1000.000');
    expect(response.body.stats.totalSent).toBe('500.000');
    expect(response.body.stats.transferCount).toBe(25);
    expect(response.body.recentTransfers).toHaveLength(1);
    expect(response.body.recentStaking).toHaveLength(1);
    expect(response.body.recentRewards).toHaveLength(1);
  });

  it('should respect limit and offset parameters', async () => {
    const mockTransfers: Array<{ from: string; to: string; quantity: string; memo: string; timestamp: number }> = [];
    for (let i = 0; i < 100; i++) {
      mockTransfers.push({
        from: 'alice',
        to: 'testuser',
        quantity: '10.000',
        memo: '',
        timestamp: 1700000000 + i,
      });
    }

    getTransferHistory.mockResolvedValue(mockTransfers.slice(0, 50));

    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'transfers', limit: '50', offset: '10' });

    expect(response.status).toBe(200);
    expect(response.body.limit).toBe(50);
    expect(response.body.offset).toBe(10);
    expect(getTransferHistory).toHaveBeenCalledWith('testuser', 'MEDALS', 50, 10);
  });

  it('should cap limit at 100', async () => {
    getTransferHistory.mockResolvedValue([]);

    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'transfers', limit: '500' });

    expect(response.status).toBe(200);
    expect(response.body.limit).toBe(100);
    expect(getTransferHistory).toHaveBeenCalledWith('testuser', 'MEDALS', 100, 0);
  });

  it('should handle errors gracefully', async () => {
    getTransferHistory.mockRejectedValue(new Error('Database error'));

    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'transfers' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to fetch transaction history');
    expect(response.body.message).toBe('Database error');
  });

  it('should set proper cache headers', async () => {
    getTransferHistory.mockResolvedValue([]);

    const response = await request(server)
      .get('/api/hive-engine/history')
      .query({ account: 'testuser', type: 'transfers' });

    expect(response.headers['cache-control']).toContain('s-maxage=120');
  });
});
