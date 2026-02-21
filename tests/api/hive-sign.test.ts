/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';

const mockGetAuthenticatedUserFromSession = jest.fn();
jest.mock('@/lib/api/session-auth', () => ({
  getAuthenticatedUserFromSession: (...args: unknown[]) =>
    mockGetAuthenticatedUserFromSession(...args),
}));

const mockValidateOperations = jest.fn();
const mockSignAndBroadcast = jest.fn();
jest.mock('@/lib/hive/signing-relay', () => ({
  validateOperations: (...args: unknown[]) => mockValidateOperations(...args),
  signAndBroadcast: (...args: unknown[]) => mockSignAndBroadcast(...args),
  OperationValidationError: class OperationValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'OperationValidationError';
    }
  },
}));

const mockCheckRateLimit = jest.fn();
const mockCreateRateLimitHeaders = jest.fn();
jest.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: { signingRelay: { limit: 10, windowSeconds: 60 } },
  createRateLimitHeaders: (...args: unknown[]) => mockCreateRateLimitHeaders(...args),
}));

jest.mock('@/lib/db/prisma', () => ({
  prisma: { custodialUser: { findFirst: jest.fn() } },
}));

import { POST } from '@/app/api/hive/sign/route';
import { prisma } from '@/lib/db/prisma';
import { OperationValidationError } from '@/lib/hive/signing-relay';

const mockPrisma = prisma as unknown as {
  custodialUser: { findFirst: jest.Mock };
};

const validOperations = [
  ['vote', { voter: 'sb-testuser', author: 'alice', permlink: 'test-post', weight: 10000 }],
];

describe('POST /api/hive/sign', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'user-123',
      username: 'user@test.com',
      authType: 'soft',
      hiveUsername: 'sb-testuser',
    });

    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 9,
      reset: Date.now() + 60000,
    });

    mockPrisma.custodialUser.findFirst.mockResolvedValue({ id: 'custodial-456' });

    mockValidateOperations.mockImplementation(() => undefined);
    mockSignAndBroadcast.mockResolvedValue({ transactionId: 'tx-abc' });
    mockCreateRateLimitHeaders.mockReturnValue({});

    server = createRouteTestServer({
      routes: { 'POST /api/hive/sign': POST },
    });
  });

  afterEach((done) => {
    if (server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  it('returns 401 when not authenticated', async () => {
    mockGetAuthenticatedUserFromSession.mockResolvedValue(null);

    const response = await request(server)
      .post('/api/hive/sign')
      .send({ operations: validOperations });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.message).toBe('Authentication required');
  });

  it('returns 403 when authType is hive (not soft)', async () => {
    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'user-123',
      username: 'hiveuser',
      authType: 'hive',
      hiveUsername: 'hiveuser',
    });

    const response = await request(server)
      .post('/api/hive/sign')
      .send({ operations: validOperations });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.error.message).toContain('custodial accounts');
  });

  it('returns 400 when user has no hiveUsername', async () => {
    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'user-123',
      username: 'user@test.com',
      authType: 'soft',
      hiveUsername: null,
    });

    const response = await request(server)
      .post('/api/hive/sign')
      .send({ operations: validOperations });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('No Hive account linked to this user');
  });

  // =========================================================================
  // Body Validation
  // =========================================================================

  it('returns 400 for invalid JSON body', async () => {
    const response = await request(server)
      .post('/api/hive/sign')
      .set('Content-Type', 'application/json')
      .send('not-valid-json{{{');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Invalid JSON body');
  });

  it('returns 400 when operations is not an array', async () => {
    const response = await request(server)
      .post('/api/hive/sign')
      .send({ operations: 'not-an-array' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('operations must be a non-empty array');
  });

  it('returns 400 when operations is an empty array', async () => {
    const response = await request(server).post('/api/hive/sign').send({ operations: [] });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('operations must be a non-empty array');
  });

  it('returns 400 when operations exceeds maximum of 10', async () => {
    const ops = Array.from({ length: 11 }, (_, i) => [
      'vote',
      { voter: 'sb-testuser', author: `author-${i}`, permlink: `post-${i}`, weight: 10000 },
    ]);

    const response = await request(server).post('/api/hive/sign').send({ operations: ops });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Maximum 10 operations per request');
  });

  // =========================================================================
  // Rate Limiting
  // =========================================================================

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const response = await request(server)
      .post('/api/hive/sign')
      .send({ operations: validOperations });

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RATE_LIMITED');
    expect(response.body.error.message).toContain('Too many requests');
  });

  // =========================================================================
  // Custodial User Lookup
  // =========================================================================

  it('returns 404 when custodial account not found in DB', async () => {
    mockPrisma.custodialUser.findFirst.mockResolvedValue(null);

    const response = await request(server)
      .post('/api/hive/sign')
      .send({ operations: validOperations });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBe('Custodial account not found');
  });

  // =========================================================================
  // Operation Validation
  // =========================================================================

  it('returns 400 when validateOperations throws OperationValidationError', async () => {
    mockValidateOperations.mockImplementation(() => {
      throw new OperationValidationError('Operation not allowed: transfer');
    });

    const response = await request(server)
      .post('/api/hive/sign')
      .send({ operations: validOperations });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Operation not allowed: transfer');
  });

  it('re-throws non-OperationValidationError errors from validateOperations', async () => {
    mockValidateOperations.mockImplementation(() => {
      throw new Error('Unexpected internal failure');
    });

    const response = await request(server)
      .post('/api/hive/sign')
      .send({ operations: validOperations });

    // createApiHandler catches unhandled errors and returns 500
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });

  // =========================================================================
  // Happy Path
  // =========================================================================

  it('returns 200 with transactionId on successful broadcast', async () => {
    const response = await request(server)
      .post('/api/hive/sign')
      .send({ operations: validOperations });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ transactionId: 'tx-abc' });
  });

  it('calls signAndBroadcast with correct arguments', async () => {
    await request(server).post('/api/hive/sign').send({ operations: validOperations });

    expect(mockSignAndBroadcast).toHaveBeenCalledWith(
      'sb-testuser',
      'custodial-456',
      validOperations
    );
  });

  it('calls validateOperations with operations and hiveUsername', async () => {
    await request(server).post('/api/hive/sign').send({ operations: validOperations });

    expect(mockValidateOperations).toHaveBeenCalledWith(validOperations, 'sb-testuser');
  });

  it('looks up custodialUser by hiveUsername', async () => {
    await request(server).post('/api/hive/sign').send({ operations: validOperations });

    expect(mockPrisma.custodialUser.findFirst).toHaveBeenCalledWith({
      where: { hiveUsername: 'sb-testuser' },
      select: { id: true },
    });
  });
});
