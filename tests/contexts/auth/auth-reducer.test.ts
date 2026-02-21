/** @jest-environment node */

import { authReducer, AuthAction } from '@/contexts/auth/auth-reducer';
import { initialAuthState, AuthStateInternal } from '@/contexts/auth/auth-types';
import type { User } from '@/types';
import type { HiveAuthUser } from '@/lib/shared/types';

// Suppress debug logs from the reducer
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    username: 'testuser',
    isHiveAuth: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeHiveUser(overrides: Partial<HiveAuthUser> = {}): HiveAuthUser {
  return {
    username: 'hiveuser',
    isAuthenticated: true,
    provider: 'keychain',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// authReducer
// ---------------------------------------------------------------------------

describe('authReducer', () => {
  it('RESTORE_SESSION sets user, authType, hiveUser, loginAt and marks client ready', () => {
    const user = makeUser();
    const hiveUser = makeHiveUser();
    const loginAt = Date.now();

    const result = authReducer(initialAuthState, {
      type: 'RESTORE_SESSION',
      payload: { user, authType: 'hive', hiveUser, loginAt },
    });

    expect(result.user).toBe(user);
    expect(result.authType).toBe('hive');
    expect(result.hiveUser).toBe(hiveUser);
    expect(result.loginAt).toBe(loginAt);
    expect(result.isClient).toBe(true);
    expect(result.hasMounted).toBe(true);
    expect(result.isLoading).toBe(false);
    expect(result.profileLoadFailed).toBe(false);
  });

  it('SESSION_EXPIRED sets isClient, hasMounted, isLoading without touching user', () => {
    const before: AuthStateInternal = {
      ...initialAuthState,
      user: makeUser(),
      authType: 'soft',
    };

    const result = authReducer(before, { type: 'SESSION_EXPIRED' });

    expect(result.isClient).toBe(true);
    expect(result.hasMounted).toBe(true);
    expect(result.isLoading).toBe(false);
    // user and authType preserved (not cleared by SESSION_EXPIRED)
    expect(result.user).toBe(before.user);
    expect(result.authType).toBe('soft');
  });

  it('INVALID_SESSION behaves identically to SESSION_EXPIRED', () => {
    const result = authReducer(initialAuthState, { type: 'INVALID_SESSION' });

    expect(result.isClient).toBe(true);
    expect(result.hasMounted).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  it('CLIENT_MOUNTED sets isClient, hasMounted, isLoading', () => {
    const result = authReducer(initialAuthState, { type: 'CLIENT_MOUNTED' });

    expect(result.isClient).toBe(true);
    expect(result.hasMounted).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  it('LOGIN sets user, authType, hiveUser, loginAt and clears profileLoadFailed', () => {
    const before: AuthStateInternal = {
      ...initialAuthState,
      profileLoadFailed: true,
    };
    const user = makeUser({ username: 'newuser' });
    const hiveUser = makeHiveUser();
    const loginAt = Date.now();

    const result = authReducer(before, {
      type: 'LOGIN',
      payload: { user, authType: 'hive', hiveUser, loginAt },
    });

    expect(result.user).toBe(user);
    expect(result.authType).toBe('hive');
    expect(result.hiveUser).toBe(hiveUser);
    expect(result.loginAt).toBe(loginAt);
    expect(result.profileLoadFailed).toBe(false);
  });

  it('LOGIN_PROFILE_LOADED updates user and hiveUser only', () => {
    const before: AuthStateInternal = {
      ...initialAuthState,
      user: makeUser(),
      authType: 'hive',
      loginAt: 1000,
    };
    const updatedUser = makeUser({ displayName: 'Updated' });
    const updatedHiveUser = makeHiveUser({ provider: 'hivesigner' });

    const result = authReducer(before, {
      type: 'LOGIN_PROFILE_LOADED',
      payload: { user: updatedUser, hiveUser: updatedHiveUser },
    });

    expect(result.user).toBe(updatedUser);
    expect(result.hiveUser).toBe(updatedHiveUser);
    // Other fields unchanged
    expect(result.authType).toBe('hive');
    expect(result.loginAt).toBe(1000);
  });

  it('LOGIN_PROFILE_FAILED sets profileLoadFailed to true', () => {
    const result = authReducer(initialAuthState, { type: 'LOGIN_PROFILE_FAILED' });

    expect(result.profileLoadFailed).toBe(true);
  });

  it('LOGOUT resets user, authType, hiveUser, loginAt, profileLoadFailed', () => {
    const before: AuthStateInternal = {
      ...initialAuthState,
      user: makeUser(),
      authType: 'hive',
      hiveUser: makeHiveUser(),
      loginAt: Date.now(),
      profileLoadFailed: true,
      isClient: true,
      hasMounted: true,
    };

    const result = authReducer(before, { type: 'LOGOUT' });

    expect(result.user).toBeNull();
    expect(result.authType).toBe('guest');
    expect(result.hiveUser).toBeNull();
    expect(result.loginAt).toBeUndefined();
    expect(result.profileLoadFailed).toBe(false);
    // isClient and hasMounted are preserved via spread
    expect(result.isClient).toBe(true);
    expect(result.hasMounted).toBe(true);
  });

  it('UPDATE_USER sets user and loginAt', () => {
    const user = makeUser({ displayName: 'New Name' });
    const loginAt = Date.now();

    const result = authReducer(initialAuthState, {
      type: 'UPDATE_USER',
      payload: { user, loginAt },
    });

    expect(result.user).toBe(user);
    expect(result.loginAt).toBe(loginAt);
  });

  it('UPDATE_HIVE_USER sets hiveUser', () => {
    const hiveUser = makeHiveUser({ provider: 'peakvault' });

    const result = authReducer(initialAuthState, {
      type: 'UPDATE_HIVE_USER',
      payload: hiveUser,
    });

    expect(result.hiveUser).toBe(hiveUser);
  });

  it('UPDATE_HIVE_USER accepts null', () => {
    const before: AuthStateInternal = {
      ...initialAuthState,
      hiveUser: makeHiveUser(),
    };

    const result = authReducer(before, {
      type: 'UPDATE_HIVE_USER',
      payload: null,
    });

    expect(result.hiveUser).toBeNull();
  });

  it('REFRESH_ACCOUNT sets user, hiveUser, and loginAt', () => {
    const user = makeUser({ username: 'refreshed' });
    const hiveUser = makeHiveUser({ username: 'refreshed' });
    const loginAt = Date.now();

    const result = authReducer(initialAuthState, {
      type: 'REFRESH_ACCOUNT',
      payload: { user, hiveUser, loginAt },
    });

    expect(result.user).toBe(user);
    expect(result.hiveUser).toBe(hiveUser);
    expect(result.loginAt).toBe(loginAt);
  });

  it('TOUCH_SESSION only updates loginAt', () => {
    const before: AuthStateInternal = {
      ...initialAuthState,
      user: makeUser(),
      authType: 'soft',
      loginAt: 1000,
    };
    const newLoginAt = 2000;

    const result = authReducer(before, {
      type: 'TOUCH_SESSION',
      payload: { loginAt: newLoginAt },
    });

    expect(result.loginAt).toBe(newLoginAt);
    // Everything else unchanged
    expect(result.user).toBe(before.user);
    expect(result.authType).toBe('soft');
  });

  it('unknown action type returns state unchanged', () => {
    const before: AuthStateInternal = {
      ...initialAuthState,
      user: makeUser(),
    };

    const result = authReducer(before, { type: 'UNKNOWN' } as unknown as AuthAction);

    expect(result).toBe(before);
  });
});
