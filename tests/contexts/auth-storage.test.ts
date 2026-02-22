/** @jest-environment jsdom */

jest.mock('@/lib/hive-workerbee/client', () => ({
  getWorkerBeeClient: jest.fn(),
  initializeWorkerBeeClient: jest.fn(),
  SPORTS_ARENA_CONFIG: { COMMUNITY_ID: 'hive-115814', COMMUNITY_NAME: 'sportsblock' },
}));

jest.mock('@/lib/hive-workerbee/account', () => ({
  fetchUserAccount: jest.fn(),
}));

jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: jest.fn(() => ({
    isReady: false,
    currentUser: null,
    currentProvider: null,
    availableProviders: [],
    login: jest.fn(),
    logout: jest.fn(),
    signMessage: jest.fn(),
    signAndBroadcast: jest.fn(),
  })),
}));

import { sanitizeHiveUserForStorage } from '@/contexts/AuthContext';
import type { HiveAuthUser } from '@/lib/shared/types';

describe('Auth storage sanitization', () => {
  it('removes session identifiers before persistence', () => {
    const hiveUser: HiveAuthUser = {
      username: 'sample',
      isAuthenticated: true,
      provider: 'keychain',
      sessionId: 'secret-session',
    };

    const sanitized = sanitizeHiveUserForStorage(hiveUser);

    expect(sanitized).toEqual({
      username: 'sample',
      isAuthenticated: true,
      provider: 'keychain',
    });
  });

  it('returns null when hive user is null', () => {
    expect(sanitizeHiveUserForStorage(null)).toBeNull();
  });
});
