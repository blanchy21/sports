/** @jest-environment jsdom */

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

import React, { useEffect } from 'react';
import { act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { HiveAccount } from '@/lib/shared/types';
import { renderWithProviders } from '../test-utils';
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

const Harness: React.FC<{ onChange: (auth: AuthApi) => void }> = ({ onChange }) => {
  const auth = useAuth();

  useEffect(() => {
    onChange(auth);
  }, [auth, onChange]);

  return null;
};

describe('AuthProvider + Aioha integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useAiohaMock.mockReturnValue({
      aioha: aiohaStub,
      isInitialized: true,
      error: null,
    });
    // Mock the fetch call to /api/hive/account/summary
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, account: mockAccountData }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('logs in via Aioha, persists sanitized state, and hydrates account data', async () => {
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

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/hive/account/summary?username=${DEFAULT_USERNAME}`),
        expect.anything()
      );
    });

    await waitFor(() => {
      expect(latestAuth?.user?.username).toBe(DEFAULT_USERNAME);
      expect(latestAuth?.authType).toBe('hive');
      expect(latestAuth?.hiveUser?.username).toBe(DEFAULT_USERNAME);
    });

    // Wait for localStorage to be updated (it happens async via useEffect)
    await waitFor(() => {
      const storedRaw = localStorage.getItem('authState');
      expect(storedRaw).not.toBeNull();
    });

    const storedRaw = localStorage.getItem('authState');
    const stored = JSON.parse(storedRaw!);
    expect(stored.user.username).toBe(DEFAULT_USERNAME);
    expect(stored.authType).toBe('hive');
    expect(stored.hiveUser).toMatchObject({
      username: DEFAULT_USERNAME,
      isAuthenticated: true,
      provider: 'aioha',
    });
    expect(stored.hiveUser?.sessionId).toBeUndefined();
  });
});

