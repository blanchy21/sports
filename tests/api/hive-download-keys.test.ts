/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';

const mockGetAuthenticatedUserFromSession = jest.fn();
jest.mock('@/lib/api/session-auth', () => ({
  getAuthenticatedUserFromSession: (...args: unknown[]) =>
    mockGetAuthenticatedUserFromSession(...args),
}));

const mockDecryptKeys = jest.fn();
jest.mock('@/lib/hive/key-encryption', () => ({
  decryptKeys: (...args: unknown[]) => mockDecryptKeys(...args),
}));

const mockGetServerSession = jest.fn();
jest.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

const mockCheckRateLimit = jest.fn();
jest.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: { keyDownload: { limit: 5, windowSeconds: 3600 } },
}));

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    custodialUser: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('@/lib/auth/next-auth-options', () => ({
  jwtFieldsCache: { invalidateByTag: jest.fn() },
  authOptions: {},
}));

import { GET } from '@/app/api/hive/download-keys/route';
import { prisma } from '@/lib/db/prisma';
import { jwtFieldsCache } from '@/lib/auth/next-auth-options';

const mockPrisma = jest.mocked(prisma);
const mockJwtFieldsCache = jest.mocked(jwtFieldsCache);

describe('GET /api/hive/download-keys', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'user-123',
      username: 'user@example.com',
      authType: 'soft',
      hiveUsername: 'sb-testuser',
    });

    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 3600000,
    });

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', hiveUsername: 'sb-testuser' },
    });

    mockPrisma.custodialUser.findUnique.mockResolvedValue({
      id: 'cust-123',
      encryptedKeys: 'enc-data',
      encryptionIv: 'iv-data',
      encryptionSalt: 'salt-data',
    } as never);
    mockPrisma.custodialUser.update.mockResolvedValue({} as never);

    mockDecryptKeys.mockReturnValue(
      JSON.stringify({
        master: 'pass',
        owner: 'key1',
        active: 'key2',
        posting: 'key3',
        memo: 'key4',
      })
    );

    server = createRouteTestServer({
      routes: {
        'GET /api/hive/download-keys': GET,
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

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when authType is hive', async () => {
    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'user-123',
      username: 'hiveuser',
      authType: 'hive',
      hiveUsername: 'hiveuser',
    });

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 when no hiveUsername', async () => {
    mockGetAuthenticatedUserFromSession.mockResolvedValue({
      userId: 'user-123',
      username: 'user@example.com',
      authType: 'soft',
      hiveUsername: null,
    });

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 3600000,
    });

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });

  it('returns 401 when NextAuth session is missing', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('re-authenticate');
  });

  it('returns 401 when NextAuth session user.id does not match', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'different-user-456' },
    });

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('re-authenticate');
  });

  it('returns 404 when custodialUser not found', async () => {
    mockPrisma.custodialUser.findUnique.mockResolvedValue(null as never);

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when encryptedKeys is null', async () => {
    mockPrisma.custodialUser.findUnique.mockResolvedValue({
      id: 'cust-123',
      encryptedKeys: null,
      encryptionIv: 'iv-data',
      encryptionSalt: 'salt-data',
    } as never);

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 500 when decryption fails and does not leak key material', async () => {
    mockDecryptKeys.mockImplementation(() => {
      throw new Error('decryption failed');
    });

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.error.message).toContain('contact support');
    expect(response.body.error.message).not.toContain('enc-data');
    expect(response.body.error.message).not.toContain('iv-data');
  });

  it('returns 200 with Content-Type text/plain', async () => {
    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  it('returns 200 with correct Content-Disposition filename', async () => {
    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="sportsblock-sb-testuser-keys.txt"'
    );
  });

  it('returns 200 with Cache-Control no-store', async () => {
    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('returns body containing key labels', async () => {
    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(200);
    const body = response.text;
    expect(body).toContain('Owner Key:');
    expect(body).toContain('Active Key:');
    expect(body).toContain('Posting Key:');
    expect(body).toContain('Memo Key:');
    expect(body).toContain('Master Password:');
  });

  it('returns body containing the actual key values from decryptKeys', async () => {
    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(200);
    const body = response.text;
    expect(body).toContain('pass');
    expect(body).toContain('key1');
    expect(body).toContain('key2');
    expect(body).toContain('key3');
    expect(body).toContain('key4');
  });

  it('marks keysDownloaded via prisma.update on success', async () => {
    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(200);
    expect(mockPrisma.custodialUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cust-123' },
        data: expect.objectContaining({
          keysDownloaded: true,
          keysDownloadedAt: expect.any(Date),
        }),
      })
    );
  });

  it('invalidates jwtFieldsCache on success', async () => {
    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(200);
    expect(mockJwtFieldsCache.invalidateByTag).toHaveBeenCalledWith('custodial-user:cust-123');
  });

  it('decryption error response does not contain any key material', async () => {
    mockDecryptKeys.mockImplementation(() => {
      throw new Error('key1 key2 key3 key4 pass');
    });

    const response = await request(server).get('/api/hive/download-keys');

    expect(response.status).toBe(500);
    const responseText = JSON.stringify(response.body);
    expect(responseText).not.toContain('key1');
    expect(responseText).not.toContain('key2');
    expect(responseText).not.toContain('key3');
    expect(responseText).not.toContain('key4');
    expect(responseText).not.toContain('pass');
  });
});
