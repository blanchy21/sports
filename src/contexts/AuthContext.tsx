'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
} from 'react';
import { logger } from '@/lib/logger';
import { AuthType, User } from '@/types';
import { HiveAuthUser, UserAccountData } from '@/lib/shared/types';
import { useAioha } from '@/contexts/AiohaProvider';
import { AuthUser, FirebaseAuth } from '@/lib/firebase/auth';
import { parseAuthState } from '@/lib/validation/auth-schema';
import { fetchWithRetry } from '@/lib/utils/api-retry';
import type { AiohaInstance, AiohaRawLoginResult, ExtractedAiohaUser } from '@/lib/aioha/types';
import { extractFromRawLoginResult, extractFromAiohaInstance } from '@/lib/aioha/types';

// Import from split modules
import {
  AUTH_STORAGE_KEY,
  AuthContextValue,
  AuthProviderProps,
  initialAuthState,
} from './auth/auth-types';
import { hasValidAccountData } from './auth/auth-type-guards';
import {
  isSessionExpired,
  persistAuthState,
  clearPersistedAuthState,
  loadPersistedAuthState,
} from './auth/auth-persistence';
import { authReducer } from './auth/auth-reducer';

// Re-export types for backwards compatibility
export type { AuthContextValue } from './auth/auth-types';
export { sanitizeHiveUserForStorage } from './auth/auth-persistence';

// ============================================================================
// Context and Hook
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ============================================================================
// Provider Component
// ============================================================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, dispatch] = useReducer(authReducer, initialAuthState);
  const { aioha, isInitialized } = useAioha();

  // Track if we need to refresh Hive account after mount
  const needsHiveRefresh = React.useRef(false);

  // AbortController for cancelling in-flight profile fetch requests
  const profileFetchController = useRef<AbortController | null>(null);

  const { user, authType, hiveUser, isLoading, isClient, hasMounted, profileLoadFailed } =
    authState;

  // Wrapper for setHiveUser to maintain API compatibility
  const setHiveUser = useCallback((newHiveUser: HiveAuthUser | null) => {
    dispatch({ type: 'UPDATE_HIVE_USER', payload: newHiveUser });
  }, []);

  // ============================================================================
  // Session Restoration Effect
  // ============================================================================

  useEffect(() => {
    requestAnimationFrame(() => {
      const savedAuth = loadPersistedAuthState();

      if (savedAuth) {
        const validatedState = parseAuthState(savedAuth);
        if (validatedState) {
          const {
            user: savedUser,
            authType: savedAuthType,
            hiveUser: savedHiveUser,
            loginAt: savedLoginAt,
          } = validatedState;

          if (isSessionExpired(savedLoginAt)) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            logger.info('Session expired after 30 minutes of inactivity', 'AuthContext');
            dispatch({ type: 'SESSION_EXPIRED' });
            return;
          }

          const restoredUser = savedUser
            ? ({ ...savedUser, isHiveAuth: savedUser.isHiveAuth ?? false } as User)
            : null;

          const restoredHiveUser = savedHiveUser
            ? ({
                ...savedHiveUser,
                isAuthenticated: savedHiveUser.isAuthenticated ?? true,
              } as HiveAuthUser)
            : null;

          if (savedAuthType === 'hive' && savedUser && !savedUser.hiveProfile) {
            needsHiveRefresh.current = true;
          }

          const refreshedLoginAt = Date.now();

          dispatch({
            type: 'RESTORE_SESSION',
            payload: {
              user: restoredUser,
              authType: savedAuthType,
              hiveUser: restoredHiveUser,
              loginAt: refreshedLoginAt,
            },
          });

          persistAuthState({
            user: restoredUser,
            authType: savedAuthType,
            hiveUser: restoredHiveUser,
            loginAt: refreshedLoginAt,
          });
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          logger.warn('Cleared invalid auth state from localStorage', 'AuthContext');
          dispatch({ type: 'INVALID_SESSION' });
        }
      } else {
        dispatch({ type: 'CLIENT_MOUNTED' });
      }
    });
  }, []);

  // Separate effect for Hive account refresh
  useEffect(() => {
    if (!isLoading && needsHiveRefresh.current) {
      needsHiveRefresh.current = false;
      refreshHiveAccount();
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // Login Methods
  // ============================================================================

  const login = useCallback(
    (newUser: User, newAuthType: AuthType) => {
      const now = Date.now();
      dispatch({
        type: 'LOGIN',
        payload: {
          user: newUser,
          authType: newAuthType,
          hiveUser: authState.hiveUser,
          loginAt: now,
        },
      });
      persistAuthState({
        user: newUser,
        authType: newAuthType,
        hiveUser: authState.hiveUser,
        loginAt: now,
      });
    },
    [authState.hiveUser]
  );

  const loginWithFirebase = useCallback((authUser: AuthUser) => {
    const now = Date.now();
    const newUser: User = {
      id: authUser.id,
      username: authUser.username,
      displayName: authUser.displayName,
      avatar: authUser.avatar,
      isHiveAuth: authUser.isHiveUser,
      hiveUsername: authUser.hiveUsername,
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt,
    };

    const newAuthType = authUser.isHiveUser ? 'hive' : 'soft';
    const newHiveUser = authUser.isHiveUser
      ? { username: authUser.hiveUsername!, isAuthenticated: true }
      : null;

    dispatch({
      type: 'LOGIN',
      payload: { user: newUser, authType: newAuthType, hiveUser: newHiveUser, loginAt: now },
    });
    persistAuthState({ user: newUser, authType: newAuthType, hiveUser: newHiveUser, loginAt: now });
  }, []);

  const loginWithHiveUser = useCallback(async (hiveUsername: string) => {
    try {
      const now = Date.now();
      const basicUser: User = {
        id: hiveUsername,
        username: hiveUsername,
        displayName: hiveUsername,
        isHiveAuth: true,
        hiveUsername: hiveUsername,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newHiveUser: HiveAuthUser = { username: hiveUsername, isAuthenticated: true };

      dispatch({
        type: 'LOGIN',
        payload: { user: basicUser, authType: 'hive', hiveUser: newHiveUser, loginAt: now },
      });
      persistAuthState({ user: basicUser, authType: 'hive', hiveUser: newHiveUser, loginAt: now });

      // Defer profile fetch to background
      profileFetchController.current?.abort();
      profileFetchController.current = new AbortController();
      const controller = profileFetchController.current;

      setTimeout(async () => {
        try {
          const response = await fetchWithRetry(
            `/api/hive/account/summary?username=${encodeURIComponent(hiveUsername)}`,
            { signal: controller.signal },
            { maxRetries: 3, initialDelay: 500, maxDelay: 5000 }
          );
          const result = await response.json();

          if (hasValidAccountData(result)) {
            const accountData = result.account;
            const updatedHiveUser = { ...newHiveUser, account: accountData };
            const updatedUser = createUserWithAccountData(basicUser, accountData, hiveUsername);

            dispatch({
              type: 'LOGIN_PROFILE_LOADED',
              payload: { user: updatedUser, hiveUser: updatedHiveUser },
            });
            persistAuthState({
              user: updatedUser,
              authType: 'hive',
              hiveUser: updatedHiveUser,
              loginAt: now,
            });
          }
        } catch (profileError) {
          if (profileError instanceof Error && profileError.name === 'AbortError') return;
          logger.error(
            'Error fetching Hive account data after retries',
            'AuthContext',
            profileError
          );
          dispatch({ type: 'LOGIN_PROFILE_FAILED' });
        }
      }, 0);
    } catch (error) {
      logger.error('Error logging in with Hive user', 'AuthContext', error);
    }
  }, []);

  const loginWithAioha = useCallback(
    async (loginResult?: AiohaRawLoginResult) => {
      if (!isInitialized || !aioha) {
        throw new Error(
          'Aioha authentication is not available. Please refresh the page and try again.'
        );
      }

      try {
        const aiohaInstance = aioha as AiohaInstance;
        let extracted: ExtractedAiohaUser | null = null;

        if (loginResult) extracted = extractFromRawLoginResult(loginResult);
        if (!extracted) extracted = extractFromAiohaInstance(aiohaInstance);

        if (!extracted && loginResult) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
            extracted = extractFromAiohaInstance(aiohaInstance);
            if (extracted) break;
          }
        }

        if (!extracted && typeof aiohaInstance.getUser === 'function') {
          try {
            const getUserResult = await aiohaInstance.getUser();
            if (getUserResult?.username)
              extracted = { username: getUserResult.username, sessionId: getUserResult.sessionId };
          } catch {
            // getUser failed
          }
        }

        if (!extracted && typeof window !== 'undefined') {
          const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
          if (storedAuth) {
            try {
              const parsed = JSON.parse(storedAuth);
              if (parsed.hiveUser?.username) extracted = { username: parsed.hiveUser.username };
            } catch {
              // localStorage parse failed
            }
          }
        }

        if (!extracted)
          throw new Error(
            'Unable to determine username from Aioha authentication. Please try again.'
          );

        const { username, sessionId } = extracted;
        const now = Date.now();

        const basicUser: User = {
          id: username,
          username: username,
          displayName: username,
          isHiveAuth: true,
          hiveUsername: username,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const newHiveUser: HiveAuthUser = {
          username: username,
          isAuthenticated: true,
          provider: loginResult?.provider ?? 'aioha',
          sessionId: sessionId,
        };

        dispatch({
          type: 'LOGIN',
          payload: { user: basicUser, authType: 'hive', hiveUser: newHiveUser, loginAt: now },
        });
        persistAuthState({
          user: basicUser,
          authType: 'hive',
          hiveUser: newHiveUser,
          loginAt: now,
        });

        // Defer profile fetch to background
        profileFetchController.current?.abort();
        profileFetchController.current = new AbortController();
        const controller = profileFetchController.current;

        setTimeout(async () => {
          try {
            const response = await fetchWithRetry(
              `/api/hive/account/summary?username=${encodeURIComponent(username)}`,
              { signal: controller.signal },
              { maxRetries: 3, initialDelay: 500, maxDelay: 5000 }
            );
            const result = await response.json();

            if (hasValidAccountData(result)) {
              const accountData = result.account;
              const updatedHiveUser: HiveAuthUser = { ...newHiveUser, account: accountData };
              const updatedUser = createUserWithAccountData(basicUser, accountData, username);

              dispatch({
                type: 'LOGIN_PROFILE_LOADED',
                payload: { user: updatedUser, hiveUser: updatedHiveUser },
              });
              persistAuthState({
                user: updatedUser,
                authType: 'hive',
                hiveUser: updatedHiveUser,
                loginAt: now,
              });
            }
          } catch (profileError) {
            if (profileError instanceof Error && profileError.name === 'AbortError') return;
            logger.error(
              'Error fetching Hive account data after retries',
              'AuthContext',
              profileError
            );
            dispatch({ type: 'LOGIN_PROFILE_FAILED' });
          }
        }, 0);
      } catch (error) {
        logger.error('Error processing Aioha authentication', 'AuthContext', error);
        throw error;
      }
    },
    [aioha, isInitialized]
  );

  // ============================================================================
  // Logout
  // ============================================================================

  const logout = useCallback(async () => {
    profileFetchController.current?.abort();
    profileFetchController.current = null;

    if (hiveUser?.provider && aioha) {
      try {
        const aiohaInstance = aioha as AiohaInstance;
        if (aiohaInstance.logout) await aiohaInstance.logout();
      } catch (error) {
        logger.error('Error logging out from Aioha', 'AuthContext', error);
      }
    }

    if (authType === 'soft') {
      try {
        await FirebaseAuth.signOut();
      } catch (error) {
        logger.error('Error logging out from Firebase', 'AuthContext', error);
      }
    }

    dispatch({ type: 'LOGOUT' });
    clearPersistedAuthState();
  }, [aioha, authType, hiveUser?.provider]);

  // ============================================================================
  // Upgrade and Update
  // ============================================================================

  const upgradeToHive = useCallback(
    async (hiveUsername: string) => {
      if (!user || authType !== 'soft') {
        throw new Error('User must be logged in with a soft account to upgrade');
      }

      try {
        const now = Date.now();
        await FirebaseAuth.upgradeToHive(user.id, hiveUsername);

        const updatedUser = { ...user, isHiveAuth: true, hiveUsername: hiveUsername };
        const newHiveUser: HiveAuthUser = { username: hiveUsername, isAuthenticated: true };

        dispatch({
          type: 'LOGIN',
          payload: { user: updatedUser, authType: 'hive', hiveUser: newHiveUser, loginAt: now },
        });
        persistAuthState({
          user: updatedUser,
          authType: 'hive',
          hiveUser: newHiveUser,
          loginAt: now,
        });

        try {
          const response = await fetchWithRetry(
            `/api/hive/account/summary?username=${encodeURIComponent(hiveUsername)}`,
            {},
            { maxRetries: 3, initialDelay: 500, maxDelay: 5000 }
          );
          const result = await response.json();

          if (hasValidAccountData(result)) {
            const accountData = result.account;
            const updatedHiveUser = { ...newHiveUser, account: accountData };
            const userWithHiveData = createUserWithAccountData(
              updatedUser,
              accountData,
              hiveUsername,
              user
            );

            dispatch({
              type: 'LOGIN_PROFILE_LOADED',
              payload: { user: userWithHiveData, hiveUser: updatedHiveUser },
            });
            persistAuthState({
              user: userWithHiveData,
              authType: 'hive',
              hiveUser: updatedHiveUser,
              loginAt: now,
            });
          }
        } catch (profileError) {
          logger.error(
            'Error fetching Hive account data after retries',
            'AuthContext',
            profileError
          );
          dispatch({ type: 'LOGIN_PROFILE_FAILED' });
        }
      } catch (error) {
        logger.error('Error upgrading to Hive account', 'AuthContext', error);
        throw error;
      }
    },
    [authType, user]
  );

  const updateUser = useCallback(
    (userUpdate: Partial<User>) => {
      if (user) {
        const updatedUser = { ...user, ...userUpdate };
        const now = Date.now();

        dispatch({ type: 'UPDATE_USER', payload: { user: updatedUser, loginAt: now } });
        persistAuthState({ user: updatedUser, authType, hiveUser, loginAt: now });
      }
    },
    [authType, hiveUser, user]
  );

  // ============================================================================
  // Account Refresh
  // ============================================================================

  const applyAccountData = useCallback(
    (accountData: UserAccountData) => {
      if (!hiveUser) return;

      const updatedHiveUser: HiveAuthUser = {
        ...hiveUser,
        username: hiveUser.username,
        account: accountData,
      };

      if (user) {
        const updatedUser = createUserWithAccountData(user, accountData, hiveUser.username, user);
        const now = Date.now();

        dispatch({
          type: 'REFRESH_ACCOUNT',
          payload: { user: updatedUser, hiveUser: updatedHiveUser, loginAt: now },
        });
        persistAuthState({ user: updatedUser, authType, hiveUser: updatedHiveUser, loginAt: now });
      } else {
        dispatch({ type: 'UPDATE_HIVE_USER', payload: updatedHiveUser });
      }
    },
    [authType, hiveUser, user]
  );

  const refreshHiveAccount = useCallback(async () => {
    if (!hiveUser?.username) return;

    try {
      const response = await fetchWithRetry(
        `/api/hive/account/summary?username=${encodeURIComponent(hiveUser.username)}`,
        {},
        { maxRetries: 3, initialDelay: 500, maxDelay: 5000 }
      );
      const result = await response.json();

      if (hasValidAccountData(result)) {
        const { account } = result;
        const accountData: UserAccountData = {
          ...account,
          createdAt: account.createdAt
            ? new Date(account.createdAt as unknown as string)
            : new Date(),
          lastPost: account.lastPost ? new Date(String(account.lastPost)) : undefined,
          lastVote: account.lastVote ? new Date(String(account.lastVote)) : undefined,
        };
        applyAccountData(accountData);
      }
    } catch (error) {
      logger.error('Error refreshing Hive account after retries', 'AuthContext', error);
    }
  }, [applyAccountData, hiveUser]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: AuthContextValue = {
    user,
    authType,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithHiveUser,
    loginWithAioha,
    loginWithFirebase,
    logout,
    updateUser,
    upgradeToHive,
    hiveUser,
    setHiveUser,
    refreshHiveAccount,
    isClient,
    hasMounted,
    profileLoadFailed,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a User object with Hive account data merged in
 */
function createUserWithAccountData(
  baseUser: User,
  accountData: UserAccountData,
  hiveUsername: string,
  existingUser?: User
): User {
  return {
    ...baseUser,
    reputation: accountData.reputation,
    reputationFormatted: accountData.reputationFormatted,
    liquidHiveBalance: accountData.liquidHiveBalance,
    liquidHbdBalance: accountData.liquidHbdBalance,
    savingsHiveBalance: accountData.savingsHiveBalance,
    savingsHbdBalance: accountData.savingsHbdBalance,
    hiveBalance: accountData.hiveBalance,
    hbdBalance: accountData.hbdBalance,
    hivePower: accountData.hivePower,
    rcPercentage: accountData.resourceCredits,
    savingsApr: accountData.savingsApr,
    pendingWithdrawals: accountData.pendingWithdrawals,
    hiveProfile: accountData.profile,
    hiveStats: accountData.stats,
    avatar: accountData.profile.profileImage || existingUser?.avatar,
    displayName: accountData.profile.name || existingUser?.displayName || hiveUsername,
    bio: accountData.profile.about || existingUser?.bio,
    createdAt: accountData.createdAt,
  };
}
