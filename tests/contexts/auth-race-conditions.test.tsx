/** @jest-environment jsdom */

/**
 * Tests for auth race conditions and state synchronization
 *
 * These tests verify that the auth system handles concurrent operations
 * correctly and prevents race conditions that could lead to stale state.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

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

// Mock Firebase auth
jest.mock('@/lib/firebase/auth', () => ({
  FirebaseAuth: {
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
    upgradeToHive: jest.fn(),
  },
}));

// Mock API fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
interface MockLocalStorage {
  store: Record<string, string>;
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
}

const localStorageMock: MockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string): string | null => localStorageMock.store[key] ?? null),
  setItem: jest.fn((key: string, value: string): void => {
    localStorageMock.store[key] = value;
  }),
  removeItem: jest.fn((key: string): void => {
    delete localStorageMock.store[key];
  }),
  clear: jest.fn((): void => {
    localStorageMock.store = {};
  }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock requestAnimationFrame
window.requestAnimationFrame = (callback) => {
  callback(0);
  return 0;
};

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Test component that exposes auth methods
function AuthTestComponent({ onAuthChange }: { onAuthChange?: (auth: ReturnType<typeof useAuth>) => void }) {
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
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockReset();
    mockAioha.logout.mockReset();
    mockAioha.user = null;
  });

  describe('Session Expiration', () => {
    it('clears session when expired and prevents stale auth state', async () => {
      // Set up an expired session in localStorage
      const expiredSession = {
        user: { id: 'olduser', username: 'olduser', isHiveAuth: true },
        authType: 'hive',
        hiveUser: { username: 'olduser', isAuthenticated: true },
        loginAt: Date.now() - (31 * 60 * 1000), // 31 minutes ago (expired)
      };
      localStorageMock.setItem('authState', JSON.stringify(expiredSession));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

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

      // Should have logged session expiration
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Session expired')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Invalid Session Data', () => {
    it('handles corrupted localStorage data gracefully', async () => {
      // Set up corrupted data
      localStorageMock.setItem('authState', 'not-valid-json');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

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

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Valid Session Restoration', () => {
    it('restores valid session from localStorage', async () => {
      // Set up a valid session in localStorage
      const validSession = {
        user: { id: 'testuser', username: 'testuser', isHiveAuth: true },
        authType: 'hive',
        hiveUser: { username: 'testuser', isAuthenticated: true },
        loginAt: Date.now() - (5 * 60 * 1000), // 5 minutes ago (not expired)
      };
      localStorageMock.setItem('authState', JSON.stringify(validSession));

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
      // Setup a failing profile fetch
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/hive/account/summary')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      let authRef: ReturnType<typeof useAuth> | undefined;

      render(
        <AuthProvider>
          <AuthTestComponent onAuthChange={(auth) => { authRef = auth; }} />
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
      const validSession = {
        user: { id: 'testuser', username: 'testuser', isHiveAuth: true },
        authType: 'hive',
        hiveUser: { username: 'testuser', isAuthenticated: true },
        loginAt: Date.now(),
      };
      localStorageMock.setItem('authState', JSON.stringify(validSession));

      let authRef: ReturnType<typeof useAuth> | undefined;

      render(
        <AuthProvider>
          <AuthTestComponent onAuthChange={(auth) => { authRef = auth; }} />
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
