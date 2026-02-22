/** @jest-environment jsdom */

/**
 * Integration tests for AuthProvider + Wallet
 *
 * Tests the full authentication flow when logging in via wallet (Hive Keychain/HiveSigner).
 * Uses the cookie-based session API for persistence.
 */

import React, { useEffect } from 'react';
import { act, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { createAuthMockFetch, createMockLocalStorage } from './auth-test-utils';

// Mock Wallet provider
jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: jest.fn(),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { UserAccountData } from '@/lib/hive-workerbee/account';
import { useWallet } from '@/contexts/WalletProvider';
import type { WalletProvider } from '@/lib/wallet/types';

type AuthApi = ReturnType<typeof useAuth>;

const useWalletMock = useWallet as jest.MockedFunction<typeof useWallet>;

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

const walletStub = {
  isReady: true,
  currentUser: DEFAULT_USERNAME,
  currentProvider: 'keychain' as const,
  availableProviders: ['keychain', 'hivesigner'] as WalletProvider[],
  error: null as string | null,
  login: jest.fn(),
  logout: jest.fn(),
  signMessage: jest.fn().mockResolvedValue({ success: true, signature: 'mock-signature-hex' }),
  signAndBroadcast: jest.fn().mockResolvedValue({ success: true, transactionId: 'tx-123' }),
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

describe('AuthProvider + Wallet integration', () => {
  let authMock: ReturnType<typeof createAuthMockFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    // Re-set signMessage mock after clearAllMocks
    walletStub.signMessage.mockResolvedValue({ success: true, signature: 'mock-signature-hex' });

    useWalletMock.mockReturnValue(walletStub as ReturnType<typeof useWallet>);

    // Create auth mock with custom account data
    authMock = createAuthMockFetch({
      accountData: mockAccountData as unknown as Record<string, unknown>,
    });
    global.fetch = authMock.mockFetch as unknown as typeof fetch;
  });

  it('logs in via wallet and updates auth state correctly', async () => {
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
      success: true as const,
      username: DEFAULT_USERNAME,
      provider: 'keychain' as const,
    };

    await act(async () => {
      await latestAuth!.loginWithWallet(loginResult);
    });

    // Verify auth state is correctly updated
    await waitFor(() => {
      expect(latestAuth?.user?.username).toBe(DEFAULT_USERNAME);
      expect(latestAuth?.authType).toBe('hive');
      expect(latestAuth?.isAuthenticated).toBe(true);
      expect(latestAuth?.hiveUser?.username).toBe(DEFAULT_USERNAME);
      expect(latestAuth?.hiveUser?.isAuthenticated).toBe(true);
      expect(latestAuth?.hiveUser?.provider).toBe('keychain');
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
          (call) => call[1]?.method === 'POST' && String(call[0]).includes('/api/auth/sb-session')
        );
        expect(postCalls.length).toBeGreaterThan(0);
      },
      { timeout: 500 }
    );

    // Verify hiveUser has correct provider
    expect(latestAuth!.hiveUser).toMatchObject({
      username: DEFAULT_USERNAME,
      isAuthenticated: true,
      provider: 'keychain',
    });
  });

  it('accepts typed WalletLoginResult directly', async () => {
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

    // Test with keychain provider
    const loginResult = {
      success: true as const,
      username: 'keychain-user',
      provider: 'keychain' as const,
    };

    await act(async () => {
      await latestAuth!.loginWithWallet(loginResult);
    });

    expect(latestAuth!.user?.username).toBe('keychain-user');
    expect(latestAuth!.authType).toBe('hive');
  });
});
