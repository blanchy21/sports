/** @jest-environment jsdom */

import {
  isSessionExpired,
  sanitizeHiveUserForStorage,
  syncSessionCookie,
  clearSessionCookie,
  fetchSessionFromCookie,
  persistAuthState,
  clearPersistedAuthState,
  saveUIHint,
  loadUIHint,
  clearUIHint,
} from '@/contexts/auth/auth-persistence';
import {
  AUTH_STORAGE_KEY,
  ACTIVITY_TIMEOUT_MS,
  PERSIST_DEBOUNCE_MS,
} from '@/contexts/auth/auth-types';
import type { HiveAuthUser } from '@/lib/shared/types';
import type { User, AuthType } from '@/types';

// Mock fetch for cookie sync tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock authenticated-fetch module
jest.mock('@/lib/api/authenticated-fetch', () => ({
  setAuthInfo: jest.fn(),
  clearAuthInfo: jest.fn(),
}));

import { setAuthInfo, clearAuthInfo } from '@/lib/api/authenticated-fetch';

describe('Auth Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, authenticated: false, session: null }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Session Expiration Tests
  // ==========================================================================

  describe('isSessionExpired', () => {
    it('returns true when loginAt is undefined', () => {
      expect(isSessionExpired(undefined)).toBe(true);
    });

    it('returns true when loginAt is 0', () => {
      expect(isSessionExpired(0)).toBe(true);
    });

    it('returns true when session is older than ACTIVITY_TIMEOUT_MS', () => {
      const oldLoginAt = Date.now() - ACTIVITY_TIMEOUT_MS - 1000;
      expect(isSessionExpired(oldLoginAt)).toBe(true);
    });

    it('returns false when session is within ACTIVITY_TIMEOUT_MS', () => {
      const recentLoginAt = Date.now() - ACTIVITY_TIMEOUT_MS + 5000;
      expect(isSessionExpired(recentLoginAt)).toBe(false);
    });

    it('returns false for current timestamp', () => {
      expect(isSessionExpired(Date.now())).toBe(false);
    });

    it('correctly handles edge case just past expiration boundary', () => {
      // Just past ACTIVITY_TIMEOUT_MS should be expired
      const boundaryLoginAt = Date.now() - ACTIVITY_TIMEOUT_MS - 1;
      expect(isSessionExpired(boundaryLoginAt)).toBe(true);
    });
  });

  // ==========================================================================
  // Sanitization Tests
  // ==========================================================================

  describe('sanitizeHiveUserForStorage', () => {
    it('removes sessionId from HiveUser', () => {
      const hiveUser: HiveAuthUser = {
        username: 'testuser',
        isAuthenticated: true,
        provider: 'aioha',
        sessionId: 'secret-session-id',
      };

      const sanitized = sanitizeHiveUserForStorage(hiveUser);

      expect(sanitized).not.toHaveProperty('sessionId');
      expect(sanitized?.username).toBe('testuser');
    });

    it('removes aiohaUserId from HiveUser', () => {
      const hiveUser: HiveAuthUser = {
        username: 'testuser',
        isAuthenticated: true,
        provider: 'aioha',
        aiohaUserId: 'internal-aioha-id',
      };

      const sanitized = sanitizeHiveUserForStorage(hiveUser);

      expect(sanitized).not.toHaveProperty('aiohaUserId');
      expect(sanitized?.username).toBe('testuser');
    });

    it('removes both sessionId and aiohaUserId', () => {
      const hiveUser: HiveAuthUser = {
        username: 'testuser',
        isAuthenticated: true,
        provider: 'keychain',
        sessionId: 'secret-session',
        aiohaUserId: 'internal-id',
      };

      const sanitized = sanitizeHiveUserForStorage(hiveUser);

      expect(sanitized).toEqual({
        username: 'testuser',
        isAuthenticated: true,
        provider: 'keychain',
      });
    });

    it('returns null when hiveUser is null', () => {
      expect(sanitizeHiveUserForStorage(null)).toBeNull();
    });

    it('preserves all other properties including account data', () => {
      const hiveUser: HiveAuthUser = {
        username: 'testuser',
        isAuthenticated: true,
        provider: 'hivesigner',
        account: {
          username: 'testuser',
          reputation: 65,
          reputationFormatted: '65',
          liquidHiveBalance: 100,
          liquidHbdBalance: 50,
          savingsHiveBalance: 0,
          savingsHbdBalance: 0,
          hiveBalance: 100,
          hbdBalance: 50,
          hivePower: 1000,
          resourceCredits: 95,
          resourceCreditsFormatted: '95%',
          hasEnoughRC: true,
          profile: {},
          stats: { postCount: 10, commentCount: 5, voteCount: 100 },
          createdAt: new Date(),
          canVote: true,
          votingPower: 100,
        },
        sessionId: 'secret',
      };

      const sanitized = sanitizeHiveUserForStorage(hiveUser);

      expect(sanitized?.account?.hiveBalance).toBe(100);
      expect(sanitized?.account?.hbdBalance).toBe(50);
      expect(sanitized?.account?.hivePower).toBe(1000);
    });
  });

  // ==========================================================================
  // Cookie Sync Tests
  // ==========================================================================

  describe('syncSessionCookie', () => {
    it('sends POST request to /api/auth/sb-session with session data', async () => {
      const sessionData = {
        userId: 'user-123',
        username: 'testuser',
        authType: 'hive' as AuthType,
        hiveUsername: 'testuser',
        loginAt: Date.now(),
      };

      await syncSessionCookie(sessionData);

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/sb-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(sessionData),
      });
    });

    it('returns true on successful sync', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await syncSessionCookie({
        userId: 'user-123',
        username: 'testuser',
        authType: 'hive' as AuthType,
      });

      expect(result).toBe(true);
    });

    it('returns false on failed sync', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await syncSessionCookie({
        userId: 'user-123',
        username: 'testuser',
        authType: 'hive' as AuthType,
      });

      expect(result).toBe(false);
    });

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await syncSessionCookie({
        userId: 'user-123',
        username: 'testuser',
        authType: 'hive' as AuthType,
      });

      expect(result).toBe(false);
    });
  });

  describe('clearSessionCookie', () => {
    it('sends DELETE request to /api/auth/sb-session', async () => {
      await clearSessionCookie();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/sb-session', {
        method: 'DELETE',
        credentials: 'include',
      });
    });

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(clearSessionCookie()).resolves.toBeUndefined();
    });
  });

  describe('fetchSessionFromCookie', () => {
    it('sends GET request to /api/auth/sb-session with credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          authenticated: true,
          session: { userId: 'user-123', username: 'test', authType: 'hive' },
        }),
      });

      await fetchSessionFromCookie();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/sb-session', {
        method: 'GET',
        credentials: 'include',
      });
    });

    it('returns session data when authenticated', async () => {
      const sessionData = {
        userId: 'user-123',
        username: 'testuser',
        authType: 'hive' as AuthType,
        hiveUsername: 'testuser',
        loginAt: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          authenticated: true,
          session: sessionData,
        }),
      });

      const result = await fetchSessionFromCookie();

      expect(result.authenticated).toBe(true);
      expect(result.session?.userId).toBe('user-123');
    });

    it('returns unauthenticated when no session exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          authenticated: false,
          session: null,
        }),
      });

      const result = await fetchSessionFromCookie();

      expect(result.authenticated).toBe(false);
      expect(result.session).toBeNull();
    });

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchSessionFromCookie();

      expect(result.success).toBe(false);
      expect(result.authenticated).toBe(false);
      expect(result.session).toBeNull();
    });
  });

  // ==========================================================================
  // UI Hint Storage Tests (Non-Sensitive)
  // ==========================================================================

  describe('UI Hint Storage', () => {
    it('saves and loads UI hints correctly', () => {
      const hint = {
        wasLoggedIn: true,
        displayHint: 'Test User',
        authTypeHint: 'hive' as AuthType,
      };

      saveUIHint(hint);
      const loaded = loadUIHint();

      expect(loaded).toEqual(hint);
    });

    it('returns null for invalid hint data', () => {
      localStorage.setItem('authHint', JSON.stringify({ invalid: 'data' }));

      const loaded = loadUIHint();

      expect(loaded).toBeNull();
    });

    it('returns null for non-JSON data', () => {
      localStorage.setItem('authHint', 'not-json');

      const loaded = loadUIHint();

      expect(loaded).toBeNull();
    });

    it('clears UI hints correctly', () => {
      saveUIHint({ wasLoggedIn: true });
      clearUIHint();

      const loaded = loadUIHint();

      expect(loaded).toBeNull();
    });

    it('handles missing hint gracefully', () => {
      const loaded = loadUIHint();
      expect(loaded).toBeNull();
    });
  });

  // ==========================================================================
  // Persist Auth State Tests (Cookie-Based)
  // ==========================================================================

  describe('persistAuthState', () => {
    const testUser: User = {
      id: 'user-123',
      username: 'testuser',
      isHiveAuth: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const testHiveUser: HiveAuthUser = {
      username: 'testuser',
      isAuthenticated: true,
      provider: 'keychain',
      sessionId: 'secret-session',
    };

    it('syncs session to httpOnly cookie after debounce', async () => {
      persistAuthState({
        user: testUser,
        authType: 'hive',
        hiveUser: testHiveUser,
        loginAt: Date.now(),
      });

      // Before debounce, fetch should not be called
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance timers and flush all async operations
      await jest.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS + 10);

      // Now cookie sync should have been called
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/sb-session',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('saves UI hint to localStorage (not sensitive data)', async () => {
      persistAuthState({
        user: testUser,
        authType: 'hive',
        hiveUser: testHiveUser,
        loginAt: Date.now(),
      });

      // Advance timers and flush all async operations
      await jest.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS + 10);

      // Check UI hint is stored
      const hint = JSON.parse(localStorage.getItem('authHint') || '{}');
      expect(hint.wasLoggedIn).toBe(true);

      // Verify NO sensitive data in localStorage
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it('debounces multiple rapid calls (only persists latest state)', async () => {
      const now = new Date();
      // First call
      persistAuthState({
        user: { id: 'user-1', username: 'first', isHiveAuth: true, createdAt: now, updatedAt: now },
        authType: 'hive',
        hiveUser: null,
        loginAt: Date.now(),
      });

      // Second call before debounce
      persistAuthState({
        user: {
          id: 'user-2',
          username: 'second',
          isHiveAuth: true,
          createdAt: now,
          updatedAt: now,
        },
        authType: 'hive',
        hiveUser: null,
        loginAt: Date.now(),
      });

      // Third call before debounce
      persistAuthState({
        user: { id: 'user-3', username: 'third', isHiveAuth: true, createdAt: now, updatedAt: now },
        authType: 'hive',
        hiveUser: null,
        loginAt: Date.now(),
      });

      // Advance timers and flush all async operations
      await jest.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS + 10);

      // Only one API call should have been made (for the last state)
      const postCalls = mockFetch.mock.calls.filter((call) => call[1]?.method === 'POST');
      expect(postCalls.length).toBe(1);

      // Verify the last user was persisted
      const bodyStr = postCalls[0][1].body;
      const body = JSON.parse(bodyStr);
      expect(body.username).toBe('third');
    });

    it('calls setAuthInfo when user is present', async () => {
      persistAuthState({
        user: testUser,
        authType: 'hive',
        hiveUser: testHiveUser,
        loginAt: Date.now(),
      });

      await jest.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS + 10);

      expect(setAuthInfo).toHaveBeenCalledWith({
        userId: 'user-123',
        username: 'testuser',
      });
    });

    it('calls clearAuthInfo when user is null', async () => {
      persistAuthState({
        user: null,
        authType: 'guest',
        hiveUser: null,
      });

      await jest.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS + 10);

      expect(clearAuthInfo).toHaveBeenCalled();
    });

    it('clears session cookie when user is null', async () => {
      persistAuthState({
        user: null,
        authType: 'guest',
        hiveUser: null,
      });

      await jest.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS + 10);

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/sb-session', {
        method: 'DELETE',
        credentials: 'include',
      });
    });
  });

  // ==========================================================================
  // Clear Persisted Auth State Tests
  // ==========================================================================

  describe('clearPersistedAuthState', () => {
    it('removes legacy auth state from localStorage', async () => {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: { id: 'test' } }));
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();

      await clearPersistedAuthState();

      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it('clears UI hints from localStorage', async () => {
      saveUIHint({ wasLoggedIn: true });
      expect(localStorage.getItem('authHint')).not.toBeNull();

      await clearPersistedAuthState();

      expect(localStorage.getItem('authHint')).toBeNull();
    });

    it('clears session cookie', async () => {
      await clearPersistedAuthState();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/sb-session', {
        method: 'DELETE',
        credentials: 'include',
      });
    });

    it('handles already empty localStorage gracefully', async () => {
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      await expect(clearPersistedAuthState()).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // Security Properties Tests
  // ==========================================================================

  describe('Security Properties', () => {
    const testUser: User = {
      id: 'user-123',
      username: 'testuser',
      isHiveAuth: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('does NOT store sensitive auth data in localStorage', async () => {
      persistAuthState({
        user: testUser,
        authType: 'hive',
        hiveUser: { username: 'testuser', isAuthenticated: true },
        loginAt: Date.now(),
      });

      // Advance timers and flush all async operations
      await jest.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS + 10);

      // localStorage should NOT contain the authState key
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();

      // Only UI hint should be stored
      const hint = loadUIHint();
      expect(hint).not.toBeNull();
      expect(hint?.wasLoggedIn).toBe(true);

      // UI hint should NOT contain sensitive data
      expect(hint).not.toHaveProperty('userId');
      expect(hint).not.toHaveProperty('sessionId');
      expect(hint).not.toHaveProperty('token');
    });

    it('sends auth data to httpOnly cookie only', async () => {
      persistAuthState({
        user: testUser,
        authType: 'hive',
        hiveUser: { username: 'testuser', isAuthenticated: true },
        loginAt: Date.now(),
      });

      await jest.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS + 10);

      // Verify cookie sync was called with credentials
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/sb-session',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );

      // Verify auth data was sent to cookie endpoint
      const postCall = mockFetch.mock.calls.find((call) => call[1]?.method === 'POST');
      const body = JSON.parse(postCall[1].body);
      expect(body.userId).toBe('user-123');
      expect(body.username).toBe('testuser');
      expect(body.authType).toBe('hive');
    });
  });
});
