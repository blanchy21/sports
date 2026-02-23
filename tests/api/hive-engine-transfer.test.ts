/**
 * Tests for /api/hive-engine/transfer route
 */

/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';
import { POST } from '@/app/api/hive-engine/transfer/route';

// Mock the hive-engine modules
jest.mock('@/lib/hive-engine/tokens', () => ({
  getMedalsBalance: jest.fn(),
}));

jest.mock('@/lib/hive-engine/operations', () => ({
  buildTransferOp: jest.fn(),
  buildDelegateOp: jest.fn(),
  buildUndelegateOp: jest.fn(),
  validateOperation: jest.fn(),
}));

jest.mock('@/lib/hive-engine/client', () => ({
  isValidAccountName: jest.fn((name: string) => {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 3 || name.length > 16) return false;
    return /^[a-z][a-z0-9.-]*[a-z0-9]$/.test(name);
  }),
  isValidQuantity: jest.fn((q: string) => /^\d+\.\d{3}$/.test(q)),
  parseQuantity: jest.fn((q: string) => parseFloat(q)),
}));

jest.mock('@/lib/hive-engine/constants', () => ({
  MEDALS_CONFIG: {
    SYMBOL: 'MEDALS',
    PRECISION: 3,
  },
}));

// Mock session auth to avoid cookies() call outside Next.js request scope
const mockGetAuthenticatedUserFromSession = jest.fn();
jest.mock('@/lib/api/session-auth', () => ({
  getAuthenticatedUserFromSession: (...args: unknown[]) =>
    mockGetAuthenticatedUserFromSession(...args),
}));

const { getMedalsBalance } = jest.requireMock('@/lib/hive-engine/tokens');
const { buildTransferOp, buildDelegateOp, buildUndelegateOp, validateOperation } = jest.requireMock(
  '@/lib/hive-engine/operations'
);

describe('POST /api/hive-engine/transfer', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticated as 'sender'
    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'test-user',
      username: 'sender',
      hiveUsername: 'sender',
    });
    server = createRouteTestServer({
      routes: {
        'POST /api/hive-engine/transfer': POST,
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
      .post('/api/hive-engine/transfer')
      .send({ from: 'sender', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Authentication required');
  });

  it('should return 403 when from does not match authenticated user', async () => {
    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ from: 'other-user', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toContain('Cannot build operations for other accounts');
  });

  it('should return 400 for invalid from account', async () => {
    // Auth user matches 'x' so auth passes, but 'x' is an invalid account name
    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'test-user',
      username: 'x',
      hiveUsername: 'x',
    });

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ from: 'x', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('sender account');
  });

  it('should return 400 for missing to account', async () => {
    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ from: 'sender', quantity: '100.000' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('recipient account');
  });

  it('should return 400 for invalid quantity', async () => {
    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ from: 'sender', to: 'recipient', quantity: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('quantity');
  });

  it('should return 400 for insufficient balance on transfer', async () => {
    getMedalsBalance.mockResolvedValue({ liquid: 50 });

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ action: 'transfer', from: 'sender', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Insufficient balance');
    expect(response.body.error.details.available).toBe('50.000');
  });

  it('should return 400 for transfer to self', async () => {
    getMedalsBalance.mockResolvedValue({ liquid: 1000 });

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ action: 'transfer', from: 'sender', to: 'sender', quantity: '100.000' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Cannot transfer to yourself');
  });

  it('should build transfer operation successfully', async () => {
    const mockOp = {
      id: 'ssc-mainnet-hive',
      required_auths: ['sender'],
      required_posting_auths: [],
      json: JSON.stringify({
        contractName: 'tokens',
        contractAction: 'transfer',
        contractPayload: { symbol: 'MEDALS', to: 'recipient', quantity: '100.000' },
      }),
    };

    getMedalsBalance.mockResolvedValue({ liquid: 1000 });
    buildTransferOp.mockReturnValue(mockOp);
    validateOperation.mockReturnValue({ valid: true });

    const response = await request(server).post('/api/hive-engine/transfer').send({
      action: 'transfer',
      from: 'sender',
      to: 'recipient',
      quantity: '100.000',
      memo: 'test transfer',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.action).toBe('transfer');
    expect(response.body.operation).toEqual(mockOp);
    expect(response.body.details.from).toBe('sender');
    expect(response.body.details.to).toBe('recipient');
    expect(response.body.details.quantity).toBe('100.000');
    expect(response.body.details.memo).toBe('test transfer');
  });

  it('should return 400 for insufficient staked balance on delegate', async () => {
    getMedalsBalance.mockResolvedValue({ liquid: 1000, staked: 50 });

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ action: 'delegate', from: 'sender', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Insufficient staked balance');
    expect(response.body.error.details.available).toBe('50.000');
  });

  it('should return 400 for delegate to self', async () => {
    getMedalsBalance.mockResolvedValue({ liquid: 1000, staked: 500 });

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ action: 'delegate', from: 'sender', to: 'sender', quantity: '100.000' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Cannot delegate to yourself');
  });

  it('should build delegate operation successfully', async () => {
    const mockOp = {
      id: 'ssc-mainnet-hive',
      required_auths: ['sender'],
      required_posting_auths: [],
      json: JSON.stringify({
        contractName: 'tokens',
        contractAction: 'delegate',
        contractPayload: { symbol: 'MEDALS', to: 'recipient', quantity: '100.000' },
      }),
    };

    getMedalsBalance.mockResolvedValue({ liquid: 1000, staked: 500 });
    buildDelegateOp.mockReturnValue(mockOp);
    validateOperation.mockReturnValue({ valid: true });

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ action: 'delegate', from: 'sender', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.action).toBe('delegate');
    expect(response.body.details.from).toBe('sender');
    expect(response.body.details.to).toBe('recipient');
  });

  it('should build undelegate operation successfully', async () => {
    const mockOp = {
      id: 'ssc-mainnet-hive',
      required_auths: ['sender'],
      required_posting_auths: [],
      json: JSON.stringify({
        contractName: 'tokens',
        contractAction: 'undelegate',
        contractPayload: { symbol: 'MEDALS', from: 'recipient', quantity: '100.000' },
      }),
    };

    getMedalsBalance.mockResolvedValue({ liquid: 1000, staked: 500 });
    buildUndelegateOp.mockReturnValue(mockOp);
    validateOperation.mockReturnValue({ valid: true });

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ action: 'undelegate', from: 'sender', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.action).toBe('undelegate');
    expect(response.body.details.undelegateFrom).toBe('recipient');
  });

  it('should return 400 for invalid action', async () => {
    getMedalsBalance.mockResolvedValue({ liquid: 1000, staked: 500 });

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ action: 'invalid', from: 'sender', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Invalid action');
  });

  it('should return 400 when operation validation fails', async () => {
    getMedalsBalance.mockResolvedValue({ liquid: 1000 });
    buildTransferOp.mockReturnValue({});
    validateOperation.mockReturnValue({ valid: false, error: 'Invalid operation format' });

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ action: 'transfer', from: 'sender', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid operation format');
  });

  it('should handle errors gracefully', async () => {
    getMedalsBalance.mockRejectedValue(new Error('Network error'));

    const response = await request(server)
      .post('/api/hive-engine/transfer')
      .send({ from: 'sender', to: 'recipient', quantity: '100.000' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Network error');
    expect(response.body.code).toBe('INTERNAL_ERROR');
  });
});
