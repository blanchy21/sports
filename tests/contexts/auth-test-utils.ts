/**
 * Auth Test Utilities
 *
 * Provides mock setup for auth-related tests. The auth system uses httpOnly cookies
 * via /api/auth/sb-session API, so we need to properly mock these endpoints.
 */

import { AuthType } from '@/types';

export interface MockSessionData {
  userId: string;
  username: string;
  authType: AuthType;
  hiveUsername?: string;
  loginAt?: number;
}

export interface MockSessionState {
  authenticated: boolean;
  session: MockSessionData | null;
}

export interface MockFetchOptions {
  initialSession?: MockSessionState;
  accountData?: Record<string, unknown>;
}

/**
 * Creates a mock fetch function that properly handles auth session API calls.
 * This simulates the httpOnly cookie-based session management.
 */
export function createAuthMockFetch(mockOptions: MockFetchOptions = {}) {
  const { initialSession = { authenticated: false, session: null }, accountData } = mockOptions;

  // In-memory session state (simulates httpOnly cookie)
  let sessionState: MockSessionState = { ...initialSession };

  const mockFetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';

    // Handle session API (endpoint is /api/auth/sb-session)
    if (urlStr.includes('/api/auth/sb-session')) {
      if (method === 'GET') {
        // Return current session state
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              authenticated: sessionState.authenticated,
              session: sessionState.session,
            }),
        });
      }

      if (method === 'POST') {
        // Store session data
        const body = init?.body ? JSON.parse(init.body as string) : null;
        if (body) {
          sessionState = {
            authenticated: true,
            session: body,
          };
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'Session created' }),
        });
      }

      if (method === 'DELETE') {
        // Clear session
        sessionState = { authenticated: false, session: null };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, message: 'Session cleared' }),
        });
      }
    }

    // Handle account summary API
    if (urlStr.includes('/api/hive/account/summary')) {
      const defaultAccount = {
        username: sessionState.session?.username || 'testuser',
        reputation: 50,
        hivePower: 100,
        hiveBalance: 50,
        hbdBalance: 25,
      };
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            account: accountData ?? defaultAccount,
          }),
      });
    }

    // Handle hive challenge API (for wallet verification)
    if (urlStr.includes('/api/auth/hive-challenge')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            challenge: 'sportsblock-auth:testuser:abc123:' + Date.now(),
            mac: 'mock-mac-for-testing',
          }),
      });
    }

    // Default response for other API calls
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  return {
    mockFetch,
    getSessionState: () => sessionState,
    setSessionState: (state: MockSessionState) => {
      sessionState = state;
    },
    clearSession: () => {
      sessionState = { authenticated: false, session: null };
    },
  };
}

/**
 * Create a valid session for testing authenticated state
 */
export function createValidSession(
  username: string,
  authType: AuthType = 'hive',
  options: { hiveUsername?: string; minutesAgo?: number } = {}
): MockSessionState {
  const minutesAgo = options.minutesAgo ?? 5;
  return {
    authenticated: true,
    session: {
      userId: username,
      username,
      authType,
      hiveUsername: options.hiveUsername ?? (authType === 'hive' ? username : undefined),
      loginAt: Date.now() - minutesAgo * 60 * 1000,
    },
  };
}

/**
 * Create an expired session for testing session expiration
 */
export function createExpiredSession(
  username: string,
  authType: AuthType = 'hive'
): MockSessionState {
  return createValidSession(username, authType, { minutesAgo: 65 }); // 65 minutes ago (expired after 60 min inactivity)
}

/**
 * Mock localStorage with proper typing
 */
export function createMockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    store,
    getItem: jest.fn((key: string): string | null => store[key] ?? null),
    setItem: jest.fn((key: string, value: string): void => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string): void => {
      delete store[key];
    }),
    clear: jest.fn((): void => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
}
