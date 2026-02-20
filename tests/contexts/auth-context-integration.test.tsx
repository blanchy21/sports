/** @jest-environment jsdom */

/**
 * Integration tests for the AuthContext session lifecycle:
 * cookie restore -> login -> persist -> logout -> clear
 *
 * These tests render the real AuthProvider with mocked network layer
 * to verify the full auth state machine.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { SESSION_DURATION_MS } from '@/contexts/auth/auth-types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Aioha provider mock
jest.mock('@/contexts/AiohaProvider', () => ({
  useAioha: () => ({
    aioha: null,
    isInitialized: false,
  }),
  AiohaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/api/authenticated-fetch', () => ({
  setAuthInfo: jest.fn(),
  clearAuthInfo: jest.fn(),
}));

jest.mock('@/lib/utils/api-retry', () => ({
  fetchWithRetry: jest.fn().mockRejectedValue(new Error('not mocked')),
}));

import { setAuthInfo, clearAuthInfo } from '@/lib/api/authenticated-fetch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSessionResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      success: true,
      authenticated: true,
      session: {
        userId: 'user-1',
        username: 'blanchy',
        authType: 'hive',
        hiveUsername: 'blanchy',
        loginAt: Date.now(),
        ...overrides,
      },
    }),
  };
}

function createEmptySessionResponse() {
  return {
    ok: true,
    json: async () => ({
      success: true,
      authenticated: false,
      session: null,
    }),
  };
}

/**
 * Test consumer component that exposes AuthContext values for assertions
 */
let capturedAuth: ReturnType<typeof useAuth> | null = null;

function AuthConsumer() {
  const auth = useAuth();
  capturedAuth = auth;

  return (
    <div data-testid="auth-status">
      {auth.isLoading
        ? 'loading'
        : auth.isAuthenticated
          ? `authenticated:${auth.user?.username}`
          : 'guest'}
    </div>
  );
}

function renderAuth() {
  const result = render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthContext integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    capturedAuth = null;

    // Default: no session
    mockFetch.mockResolvedValue(createEmptySessionResponse());
  });

  // =========================================================================
  // Session restoration
  // =========================================================================

  describe('session restoration from cookie', () => {
    it('restores authenticated session from httpOnly cookie', async () => {
      mockFetch.mockResolvedValue(createSessionResponse());

      const { getByTestId } = renderAuth();

      await waitFor(() => {
        expect(getByTestId('auth-status').textContent).toBe('authenticated:blanchy');
      });

      expect(capturedAuth?.isAuthenticated).toBe(true);
      expect(capturedAuth?.user?.username).toBe('blanchy');
      expect(capturedAuth?.authType).toBe('hive');
      expect(capturedAuth?.hiveUser?.username).toBe('blanchy');
    });

    it('handles no session cookie gracefully', async () => {
      mockFetch.mockResolvedValue(createEmptySessionResponse());

      const { getByTestId } = renderAuth();

      await waitFor(() => {
        expect(getByTestId('auth-status').textContent).toBe('guest');
      });

      expect(capturedAuth?.isAuthenticated).toBe(false);
      expect(capturedAuth?.user).toBeNull();
      expect(capturedAuth?.isLoading).toBe(false);
    });

    it('handles expired session by logging out', async () => {
      const expiredLoginAt = Date.now() - SESSION_DURATION_MS - 1000;
      mockFetch.mockResolvedValue(createSessionResponse({ loginAt: expiredLoginAt }));

      const { getByTestId } = renderAuth();

      await waitFor(() => {
        expect(getByTestId('auth-status').textContent).toBe('guest');
      });

      expect(capturedAuth?.isAuthenticated).toBe(false);
    });

    it('handles cookie fetch error gracefully', async () => {
      // Use mockImplementation to reject the sb-session GET but allow other fetches
      mockFetch.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/api/auth/sb-session')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(createEmptySessionResponse());
      });

      const { getByTestId } = renderAuth();

      await waitFor(() => {
        expect(getByTestId('auth-status').textContent).toBe('guest');
      });

      expect(capturedAuth?.isLoading).toBe(false);
    });
  });

  // =========================================================================
  // Session persistence
  // =========================================================================

  describe('session persistence', () => {
    it('syncs session to cookie after restore', async () => {
      mockFetch.mockResolvedValue(createSessionResponse());

      renderAuth();

      await waitFor(() => {
        expect(capturedAuth?.isAuthenticated).toBe(true);
      });

      // After restore, a POST to /api/auth/session should refresh the cookie
      await waitFor(() => {
        const postCalls = mockFetch.mock.calls.filter((call) => call[1]?.method === 'POST');
        expect(postCalls.length).toBeGreaterThan(0);
      });
    });

    it('saves UI hint to localStorage after authenticated session', async () => {
      mockFetch.mockResolvedValue(createSessionResponse());

      renderAuth();

      await waitFor(() => {
        expect(capturedAuth?.isAuthenticated).toBe(true);
      });

      // Wait for debounced persistence
      await waitFor(() => {
        const hint = localStorage.getItem('authHint');
        expect(hint).not.toBeNull();
        if (hint) {
          const parsed = JSON.parse(hint);
          expect(parsed.wasLoggedIn).toBe(true);
          expect(parsed.displayHint).toBeDefined();
        }
      });
    });

    it('UI hint does not contain sensitive data', async () => {
      mockFetch.mockResolvedValue(createSessionResponse());

      renderAuth();

      await waitFor(() => {
        expect(capturedAuth?.isAuthenticated).toBe(true);
      });

      await waitFor(() => {
        const hint = localStorage.getItem('authHint');
        expect(hint).not.toBeNull();
        if (hint) {
          expect(hint).not.toContain('userId');
          expect(hint).not.toContain('sessionId');
          expect(hint).not.toContain('token');
        }
      });
    });
  });

  // =========================================================================
  // Logout
  // =========================================================================

  describe('logout', () => {
    it('clears auth state on logout', async () => {
      mockFetch.mockResolvedValue(createSessionResponse());

      const { getByTestId } = renderAuth();

      await waitFor(() => {
        expect(capturedAuth?.isAuthenticated).toBe(true);
      });

      // Perform logout
      await act(async () => {
        await capturedAuth?.logout();
      });

      await waitFor(() => {
        expect(getByTestId('auth-status').textContent).toBe('guest');
      });

      expect(capturedAuth?.user).toBeNull();
      expect(capturedAuth?.hiveUser).toBeNull();
      expect(capturedAuth?.authType).toBe('guest');
    });

    it('sends DELETE to cookie endpoint on logout', async () => {
      mockFetch.mockResolvedValue(createSessionResponse());

      renderAuth();

      await waitFor(() => {
        expect(capturedAuth?.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await capturedAuth?.logout();
      });

      const deleteCalls = mockFetch.mock.calls.filter((call) => call[1]?.method === 'DELETE');
      expect(deleteCalls.length).toBeGreaterThan(0);
    });

    it('clears localStorage on logout', async () => {
      mockFetch.mockResolvedValue(createSessionResponse());

      renderAuth();

      await waitFor(() => {
        expect(capturedAuth?.isAuthenticated).toBe(true);
      });

      // Set some localStorage to verify it gets cleared
      localStorage.setItem('authState', 'legacy-data');

      await act(async () => {
        await capturedAuth?.logout();
      });

      expect(localStorage.getItem('authState')).toBeNull();
    });

    it('clears auth hint from localStorage on logout', async () => {
      mockFetch.mockResolvedValue(createSessionResponse());

      renderAuth();

      await waitFor(() => {
        expect(capturedAuth?.isAuthenticated).toBe(true);
      });

      // Set hint that should get cleared
      localStorage.setItem('authHint', JSON.stringify({ wasLoggedIn: true }));

      await act(async () => {
        await capturedAuth?.logout();
      });

      expect(localStorage.getItem('authHint')).toBeNull();
    });
  });

  // =========================================================================
  // setAuthInfo sync
  // =========================================================================

  describe('authenticated fetch sync', () => {
    it('calls setAuthInfo when session is restored', async () => {
      mockFetch.mockResolvedValue(createSessionResponse());

      renderAuth();

      await waitFor(() => {
        expect(capturedAuth?.isAuthenticated).toBe(true);
      });

      // After persist, setAuthInfo should be called with user details
      await waitFor(() => {
        expect(setAuthInfo).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-1',
            username: 'blanchy',
          })
        );
      });
    });
  });

  // =========================================================================
  // Firebase auth restore
  // =========================================================================

  describe('Firebase auth session', () => {
    it('restores soft auth session from cookie', async () => {
      mockFetch.mockResolvedValue(
        createSessionResponse({
          authType: 'soft',
          hiveUsername: undefined,
        })
      );

      const { getByTestId } = renderAuth();

      await waitFor(() => {
        expect(getByTestId('auth-status').textContent).toBe('authenticated:blanchy');
      });

      expect(capturedAuth?.authType).toBe('soft');
      expect(capturedAuth?.hiveUser).toBeNull();
    });
  });
});
