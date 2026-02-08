/**
 * Tests for /api/hive-engine/stake route
 */

/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';
import { GET, POST } from '@/app/api/hive-engine/stake/route';

// Mock the hive-engine modules
jest.mock('@/lib/hive-engine/tokens', () => ({
  getStakeInfo: jest.fn(),
  getPendingUnstakes: jest.fn(),
  getDelegationsIn: jest.fn(),
  getDelegationsOut: jest.fn(),
  getCurrentStakingPool: jest.fn(),
  getTotalStaked: jest.fn(),
}));

jest.mock('@/lib/hive-engine/operations', () => ({
  buildStakeOp: jest.fn(),
  buildUnstakeOp: jest.fn(),
  buildCancelUnstakeOp: jest.fn(),
  validateOperation: jest.fn(),
}));

jest.mock('@/lib/hive-engine/client', () => ({
  formatQuantity: jest.fn((n: number) => n.toFixed(3)),
  isValidAccountName: jest.fn((name: string) => {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 3 || name.length > 16) return false;
    return /^[a-z][a-z0-9.-]*[a-z0-9]$/.test(name);
  }),
  isValidQuantity: jest.fn((q: string) => /^\d+\.\d{3}$/.test(q)),
}));

jest.mock('@/lib/hive-engine/constants', () => ({
  MEDALS_CONFIG: {
    SYMBOL: 'MEDALS',
    PRECISION: 3,
  },
  CACHE_TTLS: {
    STAKE_INFO: 60,
  },
}));

// Mock session auth to avoid cookies() call outside Next.js request scope
const mockGetAuthenticatedUserFromSession = jest.fn();
jest.mock('@/lib/api/session-auth', () => ({
  getAuthenticatedUserFromSession: (...args: unknown[]) =>
    mockGetAuthenticatedUserFromSession(...args),
}));

const {
  getStakeInfo,
  getPendingUnstakes,
  getDelegationsIn,
  getDelegationsOut,
  getCurrentStakingPool,
  getTotalStaked,
} = jest.requireMock('@/lib/hive-engine/tokens');

const { buildStakeOp, buildUnstakeOp, buildCancelUnstakeOp, validateOperation } = jest.requireMock(
  '@/lib/hive-engine/operations'
);

describe('GET /api/hive-engine/stake', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createRouteTestServer({
      routes: {
        'GET /api/hive-engine/stake': GET,
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
    const response = await request(server).get('/api/hive-engine/stake');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Account parameter is required');
  });

  it('should return 400 for invalid account name', async () => {
    const response = await request(server).get('/api/hive-engine/stake').query({ account: 'x' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid account name');
  });

  it('should return full stake info', async () => {
    const mockStakeInfo = {
      staked: 5000,
      pendingUnstake: 100,
      delegatedIn: 200,
      delegatedOut: 50,
      estimatedAPY: 10.5,
      premiumTier: 'SILVER',
      unstakingCompleteTimestamp: '2025-02-01T00:00:00Z',
    };

    const mockPendingUnstakes = [
      {
        txID: 'tx123',
        quantity: '100.000',
        quantityLeft: '50.000',
        nextTransactionTimestamp: 1234567890,
        numberTransactionsLeft: 3,
      },
    ];

    const mockDelegationsIn = [{ from: 'user1', quantity: '100.000' }];
    const mockDelegationsOut = [{ to: 'user2', quantity: '50.000' }];

    getStakeInfo.mockResolvedValue(mockStakeInfo);
    getPendingUnstakes.mockResolvedValue(mockPendingUnstakes);
    getDelegationsIn.mockResolvedValue(mockDelegationsIn);
    getDelegationsOut.mockResolvedValue(mockDelegationsOut);
    getTotalStaked.mockResolvedValue(100000);
    getCurrentStakingPool.mockReturnValue(30000);

    const response = await request(server)
      .get('/api/hive-engine/stake')
      .query({ account: 'testuser' });

    expect(response.status).toBe(200);
    expect(response.body.account).toBe('testuser');
    expect(response.body.staked).toBe('5000.000');
    expect(response.body.pendingUnstake).toBe('100.000');
    expect(response.body.stakeShare).toBe('5.0000'); // 5000/100000 * 100
    expect(response.body.pendingUnstakes).toHaveLength(1);
    expect(response.body.delegations.in).toHaveLength(1);
    expect(response.body.delegations.out).toHaveLength(1);
  });

  it('should handle errors gracefully', async () => {
    getStakeInfo.mockRejectedValue(new Error('Network error'));

    const response = await request(server)
      .get('/api/hive-engine/stake')
      .query({ account: 'testuser' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe(
      'Failed to fetch staking information. Please try again later.'
    );
  });
});

describe('POST /api/hive-engine/stake', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticated as 'testuser'
    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'test-user',
      username: 'testuser',
      hiveUsername: 'testuser',
    });
    server = createRouteTestServer({
      routes: {
        'POST /api/hive-engine/stake': POST,
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

  it('should return 401 when not authenticated', async () => {
    mockGetAuthenticatedUserFromSession.mockResolvedValue(null);

    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'stake', quantity: '100.000', account: 'testuser' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required');
  });

  it('should return 403 when account does not match authenticated user', async () => {
    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'stake', quantity: '100.000', account: 'other-user' });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Cannot build operations for other accounts');
  });

  it('should return 400 for invalid account', async () => {
    // Auth user matches 'x' so auth passes, but 'x' is an invalid account name
    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'test-user',
      username: 'x',
      hiveUsername: 'x',
    });

    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'stake', quantity: '100.000', account: 'x' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Valid account is required');
  });

  it('should build stake operation', async () => {
    const mockOp = {
      id: 'ssc-mainnet-hive',
      required_auths: ['testuser'],
      required_posting_auths: [],
      json: JSON.stringify({
        contractName: 'tokens',
        contractAction: 'stake',
        contractPayload: { symbol: 'MEDALS', quantity: '100.000', to: 'testuser' },
      }),
    };

    buildStakeOp.mockReturnValue(mockOp);
    validateOperation.mockReturnValue({ valid: true });

    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'stake', quantity: '100.000', account: 'testuser' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.action).toBe('stake');
    expect(response.body.operation).toEqual(mockOp);
  });

  it('should build unstake operation', async () => {
    const mockOp = {
      id: 'ssc-mainnet-hive',
      required_auths: ['testuser'],
      required_posting_auths: [],
      json: JSON.stringify({
        contractName: 'tokens',
        contractAction: 'unstake',
        contractPayload: { symbol: 'MEDALS', quantity: '100.000' },
      }),
    };

    buildUnstakeOp.mockReturnValue(mockOp);
    validateOperation.mockReturnValue({ valid: true });

    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'unstake', quantity: '100.000', account: 'testuser' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.action).toBe('unstake');
  });

  it('should build cancelUnstake operation', async () => {
    const mockOp = {
      id: 'ssc-mainnet-hive',
      required_auths: ['testuser'],
      required_posting_auths: [],
      json: JSON.stringify({
        contractName: 'tokens',
        contractAction: 'cancelUnstake',
        contractPayload: { txID: 'tx123' },
      }),
    };

    buildCancelUnstakeOp.mockReturnValue(mockOp);
    validateOperation.mockReturnValue({ valid: true });

    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'cancelUnstake', account: 'testuser', txId: 'tx123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.action).toBe('cancelUnstake');
  });

  it('should return 400 for invalid action', async () => {
    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'invalid', quantity: '100.000', account: 'testuser' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid action');
  });

  it('should return 400 for invalid quantity on stake', async () => {
    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'stake', quantity: 'invalid', account: 'testuser' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Valid quantity is required');
  });

  it('should return 400 for missing txId on cancelUnstake', async () => {
    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'cancelUnstake', account: 'testuser' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Transaction ID');
  });

  it('should return 400 when operation validation fails', async () => {
    buildStakeOp.mockReturnValue({});
    validateOperation.mockReturnValue({ valid: false, error: 'Invalid operation' });

    const response = await request(server)
      .post('/api/hive-engine/stake')
      .send({ action: 'stake', quantity: '100.000', account: 'testuser' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid operation');
  });
});
