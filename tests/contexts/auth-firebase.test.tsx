/** @jest-environment jsdom */

/**
 * Tests for Firebase (soft) authentication flow
 *
 * These tests verify that the Firebase email/password authentication
 * integrates correctly with the AuthContext.
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
const mockFirebaseUser = {
  id: 'firebase-user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  isHiveUser: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFirebaseAuth = {
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  upgradeToHive: jest.fn(),
  getCurrentUser: jest.fn(),
};

jest.mock('@/lib/firebase/auth', () => ({
  FirebaseAuth: mockFirebaseAuth,
}));

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

// Mock fetch to prevent URL parse errors
const mockFetch = jest.fn();
global.fetch = mockFetch;

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
      <div data-testid="auth-type">{auth.authType || 'none'}</div>
      <div data-testid="user">{auth.user?.username ?? 'none'}</div>
      <div data-testid="loading">{auth.isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="is-hive">{auth.user?.isHiveAuth ? 'hive' : 'soft'}</div>
    </div>
  );
}

describe('Firebase Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockAioha.logout.mockReset();
    mockAioha.user = null;
    mockFirebaseAuth.signIn.mockReset();
    mockFirebaseAuth.signOut.mockReset().mockResolvedValue(undefined);
    mockFirebaseAuth.upgradeToHive.mockReset();
    // Mock fetch to return successful responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, account: {} }),
    });
  });

  describe('Firebase Sign In', () => {
    it('logs in with Firebase AuthUser successfully', async () => {
      let authRef: ReturnType<typeof useAuth> | undefined;

      render(
        <AuthProvider>
          <AuthTestComponent onAuthChange={(auth) => { authRef = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Login with Firebase (passing pre-authenticated AuthUser)
      await act(async () => {
        authRef?.loginWithFirebase(mockFirebaseUser);
      });

      // User should be authenticated
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('auth-type')).toHaveTextContent('soft');
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      expect(screen.getByTestId('is-hive')).toHaveTextContent('soft');
    });

    it('handles Firebase user with isHiveUser flag', async () => {
      const hiveFirebaseUser = {
        ...mockFirebaseUser,
        isHiveUser: true,
        hiveUsername: 'hiveuser',
      };

      let authRef: ReturnType<typeof useAuth> | undefined;

      render(
        <AuthProvider>
          <AuthTestComponent onAuthChange={(auth) => { authRef = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Login with Firebase user that has Hive linked
      await act(async () => {
        authRef?.loginWithFirebase(hiveFirebaseUser);
      });

      // Should be authenticated with hive type since isHiveUser is true
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('auth-type')).toHaveTextContent('hive');
      expect(screen.getByTestId('is-hive')).toHaveTextContent('hive');
    });

    it('persists Firebase session to localStorage', async () => {
      let authRef: ReturnType<typeof useAuth> | undefined;

      render(
        <AuthProvider>
          <AuthTestComponent onAuthChange={(auth) => { authRef = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await act(async () => {
        authRef?.loginWithFirebase(mockFirebaseUser);
      });

      // Wait for localStorage to be updated (it happens async via useEffect)
      await waitFor(() => {
        const storedRaw = localStorage.getItem('authState');
        expect(storedRaw).not.toBeNull();
      });

      // Check localStorage content
      const storedRaw = localStorage.getItem('authState');
      const stored = JSON.parse(storedRaw!);
      expect(stored.authType).toBe('soft');
      expect(stored.user.username).toBe('testuser');
    });
  });

  describe('Firebase Session Restoration', () => {
    it('restores valid soft auth session from localStorage', async () => {
      const validSession = {
        user: {
          id: 'firebase-user-123',
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
          isHiveAuth: false,
        },
        authType: 'soft',
        loginAt: Date.now() - (5 * 60 * 1000), // 5 minutes ago
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

      // Should be authenticated with soft auth
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('auth-type')).toHaveTextContent('soft');
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });
  });

  describe('Firebase Logout', () => {
    it('logs out Firebase user and clears state', async () => {
      let authRef: ReturnType<typeof useAuth> | undefined;

      render(
        <AuthProvider>
          <AuthTestComponent onAuthChange={(auth) => { authRef = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Login first
      await act(async () => {
        authRef?.loginWithFirebase(mockFirebaseUser);
      });

      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated');

      // Logout
      await act(async () => {
        await authRef?.logout();
      });

      // Should be logged out
      expect(screen.getByTestId('auth-state')).toHaveTextContent('guest');
      expect(screen.getByTestId('user')).toHaveTextContent('none');
    });
  });
});

describe('Firebase to Hive Upgrade Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, account: {} }),
    });
  });

  it('allows Firebase user to upgrade to Hive auth', async () => {
    mockFirebaseAuth.upgradeToHive.mockResolvedValue(undefined);

    let authRef: ReturnType<typeof useAuth> | undefined;

    render(
      <AuthProvider>
        <AuthTestComponent onAuthChange={(auth) => { authRef = auth; }} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    // Login with Firebase first (soft auth)
    await act(async () => {
      authRef?.loginWithFirebase(mockFirebaseUser);
    });

    expect(screen.getByTestId('is-hive')).toHaveTextContent('soft');

    // Now upgrade to Hive
    await act(async () => {
      await authRef?.loginWithHiveUser('hiveuser');
    });

    // Should now be Hive authenticated
    await waitFor(() => {
      expect(screen.getByTestId('auth-type')).toHaveTextContent('hive');
      expect(screen.getByTestId('is-hive')).toHaveTextContent('hive');
    });
  });
});

describe('Auth Type Switching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, account: {} }),
    });
  });

  it('can switch from Hive auth to soft auth', async () => {
    // Start with Hive session
    const hiveSession = {
      user: { id: 'hiveuser', username: 'hiveuser', isHiveAuth: true },
      authType: 'hive',
      hiveUser: { username: 'hiveuser', isAuthenticated: true },
      loginAt: Date.now(),
    };
    localStorageMock.setItem('authState', JSON.stringify(hiveSession));

    let authRef: ReturnType<typeof useAuth> | undefined;

    render(
      <AuthProvider>
        <AuthTestComponent onAuthChange={(auth) => { authRef = auth; }} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    // Should start as Hive user
    expect(screen.getByTestId('auth-type')).toHaveTextContent('hive');

    // Logout Hive
    await act(async () => {
      await authRef?.logout();
    });

    // Login with Firebase (soft auth)
    await act(async () => {
      authRef?.loginWithFirebase(mockFirebaseUser);
    });

    // Should now be soft auth user
    expect(screen.getByTestId('auth-type')).toHaveTextContent('soft');
    expect(screen.getByTestId('is-hive')).toHaveTextContent('soft');
  });
});
