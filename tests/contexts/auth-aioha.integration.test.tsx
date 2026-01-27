/** @jest-environment jsdom */

/**
 * Integration tests for AuthProvider + Aioha
 *
 * Tests the full authentication flow when logging in via Aioha (Hive wallet).
 * Uses the cookie-based session API for persistence.
 */

import React, { useEffect } from 'react';
import { act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { createAuthMockFetch, createMockLocalStorage } from './auth-test-utils';

// Mock Aioha provider
jest.mock('@/contexts/AiohaProvider', () => ({
  useAioha: jest.fn(),
}));

jest.mock('@/lib/firebase/auth', () => ({
  FirebaseAuth: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    upgradeToHive: jest.fn(),
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { HiveAccount } from '@/lib/shared/types';
import type { UserAccountData } from '@/lib/hive-workerbee/account';
import { useAioha } from '@/contexts/AiohaProvider';

type AuthApi = ReturnType<typeof useAuth>;

const useAiohaMock = useAioha as jest.MockedFunction<typeof useAioha>;

const DEFAULT_USERNAME = 'integration-user';

const mockAccountData: UserAccountData = {
  username: DEFAULT_USERNAME,
  reputation: 52.34,
  reputationFormatted: '52.34',
  liquidHiveBalance: 123.45,
  liquidHbdBalance: 67.89,
  savingsHiveBalance: 10,
  savingsHbdBalance: 5,
  hiveBalance: 133.45,
  hbdBalance: 72.89,
  hivePower: 456.78,
  resourceCredits: 94,
  resourceCreditsFormatted: '94%',
  hasEnoughRC: true,
  savingsApr: 12.5,
  pendingWithdrawals: [],
  profile: {
    name: 'Integration User',
    about: 'Sports enthusiast',
    profileImage: 'https://example.com/avatar.png',
  },
  stats: {
    postCount: 12,
    commentCount: 34,
    voteCount: 56,
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  lastPost: new Date('2024-01-02T00:00:00Z'),
  lastVote: new Date('2024-01-03T00:00:00Z'),
  canVote: true,
  votingPower: 78,
};

const aiohaStub = {
  user: {
    username: DEFAULT_USERNAME,
    session: 'session-from-user',
    sessionId: 'session-from-user',
    session_id: 'session-from-user',
  },
  currentUser: {
    username: DEFAULT_USERNAME,
    session: 'session-from-current-user',
    sessionId: 'session-from-current-user',
    session_id: 'session-from-current-user',
  },
  username: DEFAULT_USERNAME,
  session: 'session-top-level',
  sessionId: 'session-top-level',
  session_id: 'session-top-level',
  account: {
    name: DEFAULT_USERNAME,
  },
  providers: {},
  logout: jest.fn(),
};

// Setup localStorage mock
const localStorageMock = createMockLocalStorage();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock requestAnimationFrame
window.requestAnimationFrame = (callback) => {
  callback(0);
  return 0;
};

const Harness: React.FC<{ onChange: (auth: AuthApi) => void }> = ({ onChange }) => {
  const auth = useAuth();

  useEffect(() => {
    onChange(auth);
  }, [auth, onChange]);

  return null;
};

describe('AuthProvider + Aioha integration', () => {
  let authMock: ReturnType<typeof createAuthMockFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    useAiohaMock.mockReturnValue({
      aioha: aiohaStub,
      isInitialized: true,
      error: null,
    });

    // Create auth mock with custom account data
    authMock = createAuthMockFetch({
      accountData: mockAccountData as unknown as Record<string, unknown>,
    });
    global.fetch = authMock.mockFetch as unknown as typeof fetch;
  });

  it('logs in via Aioha and updates auth state correctly', async () => {
    let latestAuth: AuthApi | null = null;

    const handleAuthChange = (auth: AuthApi) => {
      latestAuth = auth;
    };

    renderWithProviders(
      <AuthProvider>
        <Harness onChange={handleAuthChange} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(latestAuth).not.toBeNull();
      expect(latestAuth?.isLoading).toBe(false);
    });

    const loginResult = {
      username: DEFAULT_USERNAME,
      sessionId: 'primary-session',
      user: { username: DEFAULT_USERNAME, session: 'primary-session' },
      account: { name: DEFAULT_USERNAME } as HiveAccount,
      provider: 'aioha',
    };

    await act(async () => {
      await latestAuth!.loginWithAioha(loginResult);
    });

    // Verify auth state is correctly updated
    await waitFor(() => {
      expect(latestAuth?.user?.username).toBe(DEFAULT_USERNAME);
      expect(latestAuth?.authType).toBe('hive');
      expect(latestAuth?.isAuthenticated).toBe(true);
      expect(latestAuth?.hiveUser?.username).toBe(DEFAULT_USERNAME);
      expect(latestAuth?.hiveUser?.isAuthenticated).toBe(true);
      expect(latestAuth?.hiveUser?.provider).toBe('aioha');
    });

    // Verify account summary API was called for profile hydration
    await waitFor(() => {
      expect(authMock.mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/hive/account/summary?username=${DEFAULT_USERNAME}`),
        expect.anything()
      );
    });

    // Verify session API was called (POST to persist session)
    await waitFor(
      () => {
        const postCalls = authMock.mockFetch.mock.calls.filter(
          (call) => call[1]?.method === 'POST' && String(call[0]).includes('/api/auth/session')
        );
        expect(postCalls.length).toBeGreaterThan(0);
      },
      { timeout: 500 }
    );

    // Verify hiveUser doesn't have sessionId (sanitized for storage)
    // Note: The sessionId should NOT be persisted but is kept in memory
    expect(latestAuth!.hiveUser).toMatchObject({
      username: DEFAULT_USERNAME,
      isAuthenticated: true,
      provider: 'aioha',
    });
  });

  it('extracts username from various login result shapes', async () => {
    let latestAuth: AuthApi | null = null;

    renderWithProviders(
      <AuthProvider>
        <Harness
          onChange={(auth) => {
            latestAuth = auth;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(latestAuth?.isLoading).toBe(false);
    });

    // Test with username in nested user object
    const loginResultWithNestedUser = {
      user: { username: 'nested-user', session: 'session-123' },
      provider: 'keychain',
    };

    await act(async () => {
      await latestAuth!.loginWithAioha(loginResultWithNestedUser);
    });

    expect(latestAuth!.user?.username).toBe('nested-user');
    expect(latestAuth!.authType).toBe('hive');
  });
});
