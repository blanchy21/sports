/** @jest-environment jsdom */

jest.mock('@/lib/hive-workerbee/client', () => ({
  getWorkerBeeClient: jest.fn(),
  initializeWorkerBeeClient: jest.fn(),
  SPORTS_ARENA_CONFIG: { COMMUNITY_ID: 'hive-115814', COMMUNITY_NAME: 'sportsblock' },
}));

jest.mock('@/lib/hive-workerbee/account', () => ({
  fetchUserAccount: jest.fn(),
}));

jest.mock('@/contexts/AiohaProvider', () => ({
  useAioha: jest.fn(() => ({ aioha: null, isInitialized: false })),
}));

jest.mock('@/lib/firebase/auth', () => ({
  FirebaseAuth: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    upgradeToHive: jest.fn(),
  },
}));

import { sanitizeHiveUserForStorage } from '@/contexts/AuthContext';
import type { HiveAuthUser } from '@/lib/shared/types';

describe('Auth storage sanitization', () => {
  it('removes Aioha session identifiers before persistence', () => {
    const hiveUser: HiveAuthUser = {
      username: 'sample',
      isAuthenticated: true,
      provider: 'aioha',
      sessionId: 'secret-session',
      aiohaUserId: 'internal-id',
    };

    const sanitized = sanitizeHiveUserForStorage(hiveUser);

    expect(sanitized).toEqual({
      username: 'sample',
      isAuthenticated: true,
      provider: 'aioha',
    });
  });

  it('returns null when hive user is null', () => {
    expect(sanitizeHiveUserForStorage(null)).toBeNull();
  });
});

