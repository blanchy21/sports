/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    custodialUser: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn(() => ({ id: 'google', name: 'Google', type: 'oauth' })),
}));

import { authOptions, jwtFieldsCache } from '@/lib/auth/next-auth-options';
import { prisma } from '@/lib/db/prisma';

const jwtCallback = authOptions.callbacks!.jwt!;
const sessionCallback = authOptions.callbacks!.session!;

const mockUpsert = prisma.custodialUser.upsert as jest.Mock;
const mockFindUnique = prisma.custodialUser.findUnique as jest.Mock;

describe('next-auth-options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jwtFieldsCache.clear();
  });

  // ── authOptions config ──────────────────────────────────────────

  it('uses jwt session strategy with 7-day maxAge', () => {
    expect(authOptions.session?.strategy).toBe('jwt');
    expect(authOptions.session?.maxAge).toBe(7 * 24 * 60 * 60);
  });

  it('routes signIn and error pages to /auth', () => {
    expect(authOptions.pages?.signIn).toBe('/auth');
    expect(authOptions.pages?.error).toBe('/auth');
  });

  // ── JWT callback — initial sign-in ──────────────────────────────

  describe('jwt callback — initial sign-in', () => {
    const baseProfile = {
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    };

    const baseAccount = { providerAccountId: 'google-123' };

    const upsertedUser = {
      id: 'cust-001',
      googleId: 'google-123',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      hiveUsername: 'sb-testuser',
      keysDownloaded: false,
    };

    it('upserts CustodialUser with correct fields', async () => {
      mockUpsert.mockResolvedValue(upsertedUser);

      await jwtCallback({
        token: {},
        account: baseAccount,
        profile: baseProfile,
      } as any);

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { googleId: 'google-123' },
        create: {
          googleId: 'google-123',
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        update: {
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });
    });

    it('sets all token fields from upserted user', async () => {
      mockUpsert.mockResolvedValue(upsertedUser);

      const result = await jwtCallback({
        token: {},
        account: baseAccount,
        profile: baseProfile,
      } as any);

      expect(result).toEqual(
        expect.objectContaining({
          custodialUserId: 'cust-001',
          email: 'test@example.com',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          hiveUsername: 'sb-testuser',
          keysDownloaded: false,
        })
      );
    });

    it('handles missing picture in profile', async () => {
      const noPictureUser = { ...upsertedUser, avatarUrl: null };
      mockUpsert.mockResolvedValue(noPictureUser);

      const result = await jwtCallback({
        token: {},
        account: baseAccount,
        profile: { email: 'test@example.com', name: 'Test User' },
      } as any);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ avatarUrl: undefined }),
          update: expect.objectContaining({ avatarUrl: undefined }),
        })
      );
      expect(result.avatarUrl).toBeUndefined();
    });
  });

  // ── JWT callback — refresh, cache miss ──────────────────────────

  describe('jwt callback — refresh, cache miss', () => {
    it('fetches from DB and populates cache when user found', async () => {
      mockFindUnique.mockResolvedValue({
        hiveUsername: 'sb-fresh',
        keysDownloaded: true,
      });

      const result = await jwtCallback({
        token: { custodialUserId: 'cust-123' },
        account: undefined,
        profile: undefined,
      } as any);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'cust-123' },
        select: { hiveUsername: true, keysDownloaded: true },
      });

      expect(result.hiveUsername).toBe('sb-fresh');
      expect(result.keysDownloaded).toBe(true);

      // Verify cache was populated
      const cached = jwtFieldsCache.get('jwt-fields:cust-123');
      expect(cached).toEqual({
        hiveUsername: 'sb-fresh',
        keysDownloaded: true,
      });
    });

    it('leaves token unchanged when DB returns null', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await jwtCallback({
        token: { custodialUserId: 'cust-999' },
        account: undefined,
        profile: undefined,
      } as any);

      expect(result.hiveUsername).toBeUndefined();
      expect(result.keysDownloaded).toBeUndefined();
    });

    it('does not set hiveUsername on token when DB returns null hiveUsername', async () => {
      mockFindUnique.mockResolvedValue({
        hiveUsername: null,
        keysDownloaded: false,
      });

      const result = await jwtCallback({
        token: { custodialUserId: 'cust-123' },
        account: undefined,
        profile: undefined,
      } as any);

      // hiveUsername should NOT be set because the code checks `if (fields.hiveUsername)`
      expect(result.hiveUsername).toBeUndefined();
      expect(result.keysDownloaded).toBe(false);
    });
  });

  // ── JWT callback — refresh, cache hit ───────────────────────────

  describe('jwt callback — refresh, cache hit', () => {
    it('reads from cache without DB call', async () => {
      jwtFieldsCache.set(
        'jwt-fields:cust-123',
        { hiveUsername: 'sb-cached', keysDownloaded: true },
        { tags: ['custodial-user:cust-123'] }
      );

      const result = await jwtCallback({
        token: { custodialUserId: 'cust-123' },
        account: undefined,
        profile: undefined,
      } as any);

      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(result.hiveUsername).toBe('sb-cached');
      expect(result.keysDownloaded).toBe(true);
    });
  });

  // ── Session callback ────────────────────────────────────────────

  describe('session callback', () => {
    it('embeds all fields into session.user', async () => {
      const session = { user: { name: 'Test' } } as any;
      const token = {
        custodialUserId: 'cust-123',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        hiveUsername: 'sb-test',
        keysDownloaded: true,
      };

      const result = await sessionCallback({ session, token } as any);

      expect(result.user).toEqual(
        expect.objectContaining({
          id: 'cust-123',
          displayName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          hiveUsername: 'sb-test',
          keysDownloaded: true,
        })
      );
    });

    it('throws when custodialUserId missing from token', async () => {
      const session = { user: { name: 'Test' } } as any;
      const token = {};

      await expect(sessionCallback({ session, token } as any)).rejects.toThrow(
        'custodialUserId missing from JWT token'
      );
    });

    it('returns session unchanged when session.user is absent', async () => {
      const session = {} as any;
      const token = { custodialUserId: 'cust-123' };

      const result = await sessionCallback({ session, token } as any);
      expect(result).toEqual({});
    });
  });

  // ── Cache tag invalidation ──────────────────────────────────────

  describe('cache', () => {
    it('invalidateByTag clears tagged entries', () => {
      jwtFieldsCache.set(
        'jwt-fields:cust-123',
        { hiveUsername: 'sb-user', keysDownloaded: false },
        { tags: ['custodial-user:cust-123'] }
      );
      jwtFieldsCache.set(
        'jwt-fields:cust-456',
        { hiveUsername: 'sb-other', keysDownloaded: true },
        { tags: ['custodial-user:cust-456'] }
      );

      const cleared = jwtFieldsCache.invalidateByTag('custodial-user:cust-123');
      expect(cleared).toBe(1);

      expect(jwtFieldsCache.get('jwt-fields:cust-123')).toBeNull();
      expect(jwtFieldsCache.get('jwt-fields:cust-456')).not.toBeNull();
    });
  });
});
