import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { AuthType, User } from '@/types';
import { HiveAuthUser } from '@/lib/shared/types';
import { useAioha } from '@/contexts/AiohaProvider';
import type { AiohaInstance, AiohaRawLoginResult, ExtractedAiohaUser } from '@/lib/aioha/types';
import { extractFromRawLoginResult, extractFromAiohaInstance } from '@/lib/aioha/types';
import {
  persistAuthState,
  clearPersistedAuthState,
  fetchSessionFromCookie,
} from './auth-persistence';
import { AuthAction } from './auth-reducer';
import { useAuthProfile, getHiveAvatarUrl } from './useAuthProfile';
import { queryClient } from '@/lib/react-query/queryClient';

export interface UseAuthActionsOptions {
  dispatch: React.Dispatch<AuthAction>;
  getState: () => {
    user: User | null;
    authType: AuthType;
    hiveUser: HiveAuthUser | null;
  };
}

export interface UseAuthActionsReturn {
  login: (newUser: User, newAuthType: AuthType) => void;
  loginWithHiveUser: (hiveUsername: string) => Promise<void>;
  loginWithAioha: (loginResult?: AiohaRawLoginResult) => Promise<void>;
  logout: () => Promise<void>;
  upgradeToHive: (hiveUsername: string) => Promise<void>;
  updateUser: (userUpdate: Partial<User>) => void;
  setHiveUser: (newHiveUser: HiveAuthUser | null) => void;
}

/**
 * Hook for auth actions (login, logout, upgrade)
 * Extracted from AuthContext to reduce complexity
 */
export function useAuthActions(options: UseAuthActionsOptions): UseAuthActionsReturn {
  const { dispatch, getState } = options;
  const { aioha, isInitialized } = useAioha();

  // Profile fetching callbacks
  const onProfileLoaded = useCallback(
    (result: { updatedUser: User; updatedHiveUser: HiveAuthUser }) => {
      const { authType } = getState();
      dispatch({
        type: 'LOGIN_PROFILE_LOADED',
        payload: { user: result.updatedUser, hiveUser: result.updatedHiveUser },
      });
      persistAuthState({
        user: result.updatedUser,
        authType,
        hiveUser: result.updatedHiveUser,
        loginAt: Date.now(),
      });
    },
    [dispatch, getState]
  );

  const onProfileFailed = useCallback(() => {
    dispatch({ type: 'LOGIN_PROFILE_FAILED' });
  }, [dispatch]);

  const { fetchProfileInBackground, fetchProfile, applyAccountData, abortFetch } = useAuthProfile({
    onProfileLoaded,
    onProfileFailed,
  });

  // ============================================================================
  // Login Methods
  // ============================================================================

  const login = useCallback(
    (newUser: User, newAuthType: AuthType) => {
      const now = Date.now();
      const { hiveUser } = getState();
      dispatch({
        type: 'LOGIN',
        payload: {
          user: newUser,
          authType: newAuthType,
          hiveUser,
          loginAt: now,
        },
      });
      persistAuthState({
        user: newUser,
        authType: newAuthType,
        hiveUser,
        loginAt: now,
      });
    },
    [dispatch, getState]
  );

  const loginWithHiveUser = useCallback(
    async (hiveUsername: string) => {
      try {
        const now = Date.now();

        // Use Hive's avatar service as immediate fallback until profile loads
        const hiveAvatarUrl = getHiveAvatarUrl(hiveUsername);

        const basicUser: User = {
          id: hiveUsername,
          username: hiveUsername,
          displayName: hiveUsername,
          avatar: hiveAvatarUrl,
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
        persistAuthState({
          user: basicUser,
          authType: 'hive',
          hiveUser: newHiveUser,
          loginAt: now,
        });

        // Fetch profile in background
        fetchProfileInBackground(hiveUsername, basicUser, newHiveUser);
      } catch (error) {
        logger.error('Error logging in with Hive user', 'useAuthActions', error);
      }
    },
    [dispatch, fetchProfileInBackground]
  );

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

        // Fallback: try to get username from current session cookie
        if (!extracted && typeof window !== 'undefined') {
          try {
            const sessionResponse = await fetchSessionFromCookie();
            if (sessionResponse.authenticated && sessionResponse.session?.hiveUsername) {
              extracted = { username: sessionResponse.session.hiveUsername };
            }
          } catch {
            // Session fetch failed
          }
        }

        if (!extracted) {
          // If called without a loginResult (e.g., auto-reconnect attempt),
          // silently return instead of throwing - the user simply isn't logged in
          if (!loginResult) {
            return;
          }
          throw new Error(
            'Unable to determine username from Aioha authentication. Please try again.'
          );
        }

        const { username, sessionId } = extracted;
        const now = Date.now();

        // Use Hive's avatar service as immediate fallback until profile loads
        const hiveAvatarUrl = getHiveAvatarUrl(username);

        const basicUser: User = {
          id: username,
          username: username,
          displayName: username,
          avatar: hiveAvatarUrl,
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

        // Fetch profile in background
        fetchProfileInBackground(username, basicUser, newHiveUser);
      } catch (error) {
        // Skip logging for empty object errors - these occur during logout transitions
        // when Aioha is in an inconsistent state
        const isEmptyObjectError =
          error !== null &&
          typeof error === 'object' &&
          !(error instanceof Error) &&
          Object.keys(error as object).length === 0;

        if (isEmptyObjectError) {
          // Silently return - this is expected during logout
          return;
        }

        // Improve error logging for debugging - handle various error types
        const errorInfo = {
          type: typeof error,
          isError: error instanceof Error,
          message: error instanceof Error ? error.message : String(error),
          value: error,
        };
        logger.error(
          'Error processing Aioha authentication',
          'useAuthActions',
          error instanceof Error ? error : new Error(errorInfo.message),
          errorInfo
        );
        throw error;
      }
    },
    [aioha, isInitialized, dispatch, fetchProfileInBackground]
  );

  // ============================================================================
  // Logout
  // ============================================================================

  const logout = useCallback(async () => {
    abortFetch();

    const { hiveUser, authType } = getState();

    if (hiveUser?.provider && aioha) {
      try {
        const aiohaInstance = aioha as AiohaInstance;
        if (aiohaInstance.logout) await aiohaInstance.logout();
      } catch (error) {
        logger.error('Error logging out from Aioha', 'useAuthActions', error);
      }
    }

    dispatch({ type: 'LOGOUT' });
    await clearPersistedAuthState();
    queryClient.clear();
  }, [aioha, dispatch, getState, abortFetch]);

  // ============================================================================
  // Upgrade and Update
  // ============================================================================

  const upgradeToHive = useCallback(
    async (hiveUsername: string) => {
      const { user, authType } = getState();

      if (!user || authType !== 'soft') {
        throw new Error('User must be logged in with a soft account to upgrade');
      }

      try {
        const now = Date.now();

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

        // Fetch profile synchronously for upgrade flow
        try {
          const accountData = await fetchProfile(hiveUsername);
          if (accountData) {
            const { updatedUser: userWithHiveData, updatedHiveUser } = applyAccountData(
              accountData,
              updatedUser,
              newHiveUser
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
            'useAuthActions',
            profileError
          );
          dispatch({ type: 'LOGIN_PROFILE_FAILED' });
        }
      } catch (error) {
        logger.error('Error upgrading to Hive account', 'useAuthActions', error);
        throw error;
      }
    },
    [dispatch, getState, fetchProfile, applyAccountData]
  );

  const updateUser = useCallback(
    (userUpdate: Partial<User>) => {
      const { user, authType, hiveUser } = getState();
      if (user) {
        const updatedUser = { ...user, ...userUpdate };
        const now = Date.now();

        dispatch({ type: 'UPDATE_USER', payload: { user: updatedUser, loginAt: now } });
        persistAuthState({ user: updatedUser, authType, hiveUser, loginAt: now });
      }
    },
    [dispatch, getState]
  );

  const setHiveUser = useCallback(
    (newHiveUser: HiveAuthUser | null) => {
      dispatch({ type: 'UPDATE_HIVE_USER', payload: newHiveUser });
    },
    [dispatch]
  );

  return {
    login,
    loginWithHiveUser,
    loginWithAioha,
    logout,
    upgradeToHive,
    updateUser,
    setHiveUser,
  };
}
