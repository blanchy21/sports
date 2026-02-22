/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';

const mockGetAuthenticatedUserFromSession = jest.fn();
jest.mock('@/lib/api/session-auth', () => ({
  getAuthenticatedUserFromSession: (...args: unknown[]) =>
    mockGetAuthenticatedUserFromSession(...args),
}));

const mockCreateHiveAccountForUser = jest.fn();
jest.mock('@/lib/hive/account-creation', () => ({
  createHiveAccountForUser: (...args: unknown[]) => mockCreateHiveAccountForUser(...args),
  AccountCreationError: class AccountCreationError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'AccountCreationError';
      this.code = code;
    }
  },
}));

const mockCheckRateLimit = jest.fn();
jest.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: { accountCreation: { limit: 3, windowSeconds: 86400 } },
}));

jest.mock('@/lib/db/prisma', () => ({
  prisma: { custodialUser: { findFirst: jest.fn() } },
}));

jest.mock('@/lib/auth/next-auth-options', () => ({
  jwtFieldsCache: { invalidateByTag: jest.fn() },
  authOptions: {},
}));

import { POST } from '@/app/api/hive/create-account/route';
import { prisma } from '@/lib/db/prisma';
import { jwtFieldsCache } from '@/lib/auth/next-auth-options';
import { AccountCreationError } from '@/lib/hive/account-creation';

const mockPrisma = jest.mocked(prisma);
const mockJwtFieldsCache = jest.mocked(jwtFieldsCache);

describe('POST /api/hive/create-account', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'user-123',
      username: 'user@example.com',
      authType: 'soft',
    });

    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 2,
      reset: Date.now() + 86400000,
    });

    mockPrisma.custodialUser.findFirst.mockResolvedValue({
      id: 'cust-123',
      hiveUsername: null,
    } as never);

    mockCreateHiveAccountForUser.mockResolvedValue({
      hiveUsername: 'sb-testuser',
    });

    server = createRouteTestServer({
      routes: {
        'POST /api/hive/create-account': POST,
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

  it('returns 401 when not authenticated', async () => {
    mockGetAuthenticatedUserFromSession.mockResolvedValue(null);

    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: 'sb-testuser' });

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
    });

    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: 'sb-testuser' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.error.message).toContain('Only custodial users');
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 86400000,
    });

    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: 'sb-testuser' });

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RATE_LIMITED');
    expect(response.body.error.message).toContain('Too many account creation attempts');
  });

  it('returns 400 when user already has hiveUsername in session', async () => {
    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'user-123',
      username: 'user@example.com',
      authType: 'soft',
      hiveUsername: 'sb-existing',
    });

    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: 'sb-testuser' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('You already have a Hive account');
  });

  it('returns 400 when username is missing from body', async () => {
    const response = await request(server).post('/api/hive/create-account').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('username is required');
  });

  it('returns 400 when body username is empty string', async () => {
    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('username is required');
  });

  it('returns 404 when custodialUser not found in DB', async () => {
    mockPrisma.custodialUser.findFirst.mockResolvedValue(null as never);

    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: 'sb-testuser' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBe('Custodial user record not found');
  });

  it('returns 400 when custodialUser already has hiveUsername in DB', async () => {
    mockPrisma.custodialUser.findFirst.mockResolvedValue({
      id: 'cust-123',
      hiveUsername: 'sb-existing',
    } as never);

    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: 'sb-testuser' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('You already have a Hive account');
  });

  it('returns 200 with hiveUsername on success', async () => {
    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: 'sb-testuser' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ hiveUsername: 'sb-testuser' });
    expect(mockCreateHiveAccountForUser).toHaveBeenCalledWith('sb-testuser', 'cust-123');
  });

  it('invalidates JWT cache on success', async () => {
    await request(server).post('/api/hive/create-account').send({ username: 'sb-testuser' });

    expect(mockJwtFieldsCache.invalidateByTag).toHaveBeenCalledWith('custodial-user:cust-123');
  });

  it('returns 500 when AccountCreationError is thrown', async () => {
    mockCreateHiveAccountForUser.mockRejectedValue(
      new AccountCreationError('Insufficient claimed accounts', 'NO_ACTS')
    );

    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: 'sb-testuser' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.error.message).toBe('Insufficient claimed accounts');
  });

  it('returns 500 from createApiHandler catch when generic error is thrown', async () => {
    mockCreateHiveAccountForUser.mockRejectedValue(new Error('Unexpected failure'));

    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: 'sb-testuser' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });

  it('lowercases and trims the username', async () => {
    const response = await request(server)
      .post('/api/hive/create-account')
      .send({ username: '  SB-TestUser  ' });

    expect(response.status).toBe(200);
    expect(mockCreateHiveAccountForUser).toHaveBeenCalledWith('sb-testuser', 'cust-123');
  });
});
