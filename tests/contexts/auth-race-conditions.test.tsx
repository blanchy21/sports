/** @jest-environment jsdom */

/**
 * Tests for auth race conditions and state synchronization
 *
 * These tests verify that the auth system handles concurrent operations
 * correctly and prevents race conditions that could lead to stale state.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import {
  createAuthMockFetch,
  createValidSession,
  createExpiredSession,
  createMockLocalStorage,
} from './auth-test-utils';

// Mock WorkerBee before any other imports
jest.mock('@/lib/hive-workerbee/client', () => ({
  getWorkerBeeClient: jest.fn(),
  initializeWorkerBeeClient: jest.fn(),
  SPORTS_ARENA_CONFIG: { COMMUNITY_ID: 'hive-115814', COMMUNITY_NAME: 'sportsblock' },
}));

jest.mock('@/lib/hive-workerbee/account', () => ({
  fetchUserAccount: jest.fn(),
}));

// Mock Aioha provider
const mockAioha = {
  user: null,
  logout: jest.fn(),
};

jest.mock('@/contexts/AiohaProvider', () => ({
  useAioha: jest.fn(() => ({ aioha: mockAioha, isInitialized: true })),
  AiohaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Setup localStorage mock
const localStorageMock = createMockLocalStorage();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock requestAnimationFrame
window.requestAnimationFrame = (callback) => {
  callback(0);
  return 0;
};

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Test component that exposes auth methods
function AuthTestComponent({
  onAuthChange,
}: {
  onAuthChange?: (auth: ReturnType<typeof useAuth>) => void;
}) {
  const auth = useAuth();

  React.useEffect(() => {
    onAuthChange?.(auth);
  }, [auth, onAuthChange]);

  return (
    <div>
      <div data-testid="auth-state">{auth.isAuthenticated ? 'authenticated' : 'guest'}</div>
      <div data-testid="user">{auth.user?.username ?? 'none'}</div>
      <div data-testid="loading">{auth.isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="profile-failed">{auth.profileLoadFailed ? 'failed' : 'ok'}</div>
    </div>
  );
}

describe('Auth Race Conditions', () => {
  let authMock: ReturnType<typeof createAuthMockFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockAioha.logout.mockReset();
    mockAioha.user = null;

    // Create fresh mock for each test
    authMock = createAuthMockFetch();
    global.fetch = authMock.mockFetch as unknown as typeof fetch;
  });

  describe('Session Expiration', () => {
    it('clears session when expired and prevents stale auth state', async () => {
      // Set up an expired session via the mock
      authMock.setSessionState(createExpiredSession('olduser'));

      // Logger uses console.info for info level messages
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      // Wait for session check using real timers
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Should be in guest state due to expired session
      expect(screen.getByTestId('auth-state')).toHaveTextContent('guest');

      // Should have logged session expiration (logger.info outputs to console.info)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Session expired'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Invalid Session Data', () => {
    it('handles missing session gracefully', async () => {
      // Start with no session
      authMock.clearSession();

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Should fallback to guest state
      expect(screen.getByTestId('auth-state')).toHaveTextContent('guest');
    });
  });

  describe('Valid Session Restoration', () => {
    it('restores valid session from cookie API', async () => {
      // Set up a valid session via the mock
      authMock.setSessionState(createValidSession('testuser'));

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Should be authenticated
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });
  });

  describe('Profile Load Failure Flag', () => {
    it('user remains logged in even if profile fetch fails', async () => {
      // Start with no session (user will log in)
      authMock.clearSession();

      // Override to make account summary fail
      authMock.mockFetch.mockImplementation((input: RequestInfo | URL, options?: RequestInit) => {
        const urlStr =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (urlStr.includes('/api/auth/session')) {
          const method = options?.method || 'GET';
          if (method === 'GET') {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  success: true,
                  authenticated: authMock.getSessionState().authenticated,
                  session: authMock.getSessionState().session,
                }),
            });
          }
          if (method === 'POST') {
            const body = options?.body ? JSON.parse(options.body as string) : null;
            if (body) {
              authMock.setSessionState({ authenticated: true, session: body });
            }
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true }),
            });
          }
        }

        if (urlStr.includes('/api/hive/account/summary')) {
          return Promise.reject(new Error('Network error'));
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      let authRef: ReturnType<typeof useAuth> | undefined;

      render(
        <AuthProvider>
          <AuthTestComponent
            onAuthChange={(auth) => {
              authRef = auth;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Login
      await act(async () => {
        await authRef?.loginWithHiveUser('testuser');
      });

      // User should be logged in (basic info is available)
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });
  });

  describe('Logout Clears State', () => {
    it('logout clears all auth state', async () => {
      // Set up an authenticated session
      authMock.setSessionState(createValidSession('testuser'));

      let authRef: ReturnType<typeof useAuth> | undefined;

      render(
        <AuthProvider>
          <AuthTestComponent
            onAuthChange={(auth) => {
              authRef = auth;
            }}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Verify authenticated
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');

      // Logout
      await act(async () => {
        await authRef?.logout();
      });

      // Verify logged out
      expect(screen.getByTestId('auth-state')).toHaveTextContent('guest');
      expect(screen.getByTestId('user')).toHaveTextContent('none');
    });
  });
});
