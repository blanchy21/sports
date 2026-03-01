import { useCallback } from 'react';
import { signOut as nextAuthSignOut } from 'next-auth/react';
import { logger } from '@/lib/logger';
import { AuthType, User } from '@/types';
import { HiveAuthUser } from '@/lib/shared/types';
import { useWallet } from '@/contexts/WalletProvider';
import type { WalletLoginResult, WalletSignOutcome } from '@/lib/wallet/types';
import { getHivesignerToken } from '@/lib/wallet/hivesigner';
import {
  persistAuthState,
  syncSessionCookie,
  clearPersistedAuthState,
  fetchSessionFromCookie,
  type ChallengeData,
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
  loginWithWallet: (
    loginResult?: WalletLoginResult,
    preSignedChallengeData?: ChallengeData
  ) => Promise<void>;
  logout: () => Promise<void>;
  upgradeToHive: (hiveUsername: string) => Promise<void>;
  updateUser: (userUpdate: Partial<User>) => void;
  setHiveUser: (newHiveUser: HiveAuthUser | null) => void;
}

/**
 * Fetch a challenge from the server and sign it with the user's Hive posting key.
 * Returns ChallengeData for inclusion in the session creation request.
 */
async function signHiveChallenge(
  signFn: (username: string, message: string) => Promise<WalletSignOutcome>,
  username: string
): Promise<ChallengeData> {
  const challengeRes = await fetch(
    `/api/auth/hive-challenge?username=${encodeURIComponent(username)}`
  );
  if (!challengeRes.ok) {
    throw new Error('Failed to fetch authentication challenge');
  }
  const { challenge, mac } = await challengeRes.json();

  const signResult = await signFn(username, challenge);

  if (!signResult.success) {
    throw new Error(
      ('error' in signResult ? signResult.error : undefined) ||
        'Failed to sign authentication challenge'
    );
  }

  return {
    challenge,
    challengeMac: mac,
    signature: signResult.signature,
  };
}

/**
 * Hook for auth actions (login, logout, upgrade)
 * Extracted from AuthContext to reduce complexity
 */
export function useAuthActions(options: UseAuthActionsOptions): UseAuthActionsReturn {
  const { dispatch, getState } = options;
  const wallet = useWallet();

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
        displayName: result.updatedUser.displayName,
        avatar: result.updatedUser.avatar,
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

        // Sign challenge to prove wallet ownership
        let challengeData: ChallengeData | undefined;
        if (wallet.isReady) {
          challengeData = await signHiveChallenge(wallet.signMessage, hiveUsername);
        }

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

        // Sync cookie immediately (not debounced) so it survives page refresh / HMR
        await syncSessionCookie({
          userId: basicUser.id,
          username: basicUser.username,
          authType: 'hive',
          hiveUsername: hiveUsername,
          loginAt: now,
          challengeData,
          displayName: basicUser.displayName,
          avatar: basicUser.avatar,
        });

        // Debounced persist for UI hint & activity updates
        persistAuthState({
          user: basicUser,
          authType: 'hive',
          hiveUser: newHiveUser,
          loginAt: now,
          challengeData,
          displayName: basicUser.displayName,
          avatar: basicUser.avatar,
        });

        fetchProfileInBackground(hiveUsername, basicUser, newHiveUser);
      } catch (error) {
        logger.error('Error logging in with Hive user', 'useAuthActions', error);
        throw error;
      }
    },
    [wallet, dispatch, fetchProfileInBackground]
  );

  const loginWithWallet = useCallback(
    async (loginResult?: WalletLoginResult, preSignedChallengeData?: ChallengeData) => {
      try {
        let username: string | undefined;
        let provider: string | undefined;

        if (loginResult) {
          username = loginResult.username;
          provider = loginResult.provider;
        } else {
          // Auto-reconnect: check wallet state
          username = wallet.currentUser ?? undefined;
          if (!username) {
            try {
              const sessionResponse = await fetchSessionFromCookie();
              if (sessionResponse.authenticated && sessionResponse.session?.hiveUsername) {
                username = sessionResponse.session.hiveUsername;
              }
            } catch {
              // Session fetch failed
            }
          }
        }

        if (!username) {
          if (!loginResult) return; // Auto-reconnect, silently return
          throw new Error(
            'Unable to determine username from wallet authentication. Please try again.'
          );
        }

        const now = Date.now();

        // Use pre-signed challenge data if provided (single-popup Keychain flow).
        // Otherwise, sign a new challenge (triggers a second popup for non-Keychain providers).
        let challengeData: ChallengeData | undefined = preSignedChallengeData;
        let hivesignerToken: string | undefined;

        if (!challengeData && loginResult) {
          if (provider === 'hivesigner') {
            hivesignerToken = getHivesignerToken() ?? undefined;
          } else if (wallet.isReady) {
            challengeData = await signHiveChallenge(wallet.signMessage, username);
          }
        }

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
          provider: provider,
        };

        dispatch({
          type: 'LOGIN',
          payload: { user: basicUser, authType: 'hive', hiveUser: newHiveUser, loginAt: now },
        });

        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[loginWithWallet] challengeData present:',
            !!challengeData,
            '| fields:',
            challengeData
              ? {
                  challenge: !!challengeData.challenge,
                  mac: !!challengeData.challengeMac,
                  sig: !!challengeData.signature,
                }
              : 'none'
          );
        }

        // Sync cookie immediately (not debounced) so it survives page refresh / HMR
        const cookieSynced = await syncSessionCookie({
          userId: basicUser.id,
          username: basicUser.username,
          authType: 'hive',
          hiveUsername: username,
          loginAt: now,
          challengeData,
          hivesignerToken,
          displayName: basicUser.displayName,
          avatar: basicUser.avatar,
        });
        if (process.env.NODE_ENV === 'development' && !cookieSynced) {
          console.warn('[loginWithWallet] Direct cookie sync FAILED for user:', username);
        }

        // Debounced persist for UI hint & activity updates
        persistAuthState({
          user: basicUser,
          authType: 'hive',
          hiveUser: newHiveUser,
          loginAt: now,
          challengeData,
          hivesignerToken,
          displayName: basicUser.displayName,
          avatar: basicUser.avatar,
        });

        fetchProfileInBackground(username, basicUser, newHiveUser);
      } catch (error) {
        logger.error('Error processing wallet authentication', 'useAuthActions', error);
        throw error;
      }
    },
    [wallet, dispatch, fetchProfileInBackground]
  );

  // ============================================================================
  // Logout
  // ============================================================================

  const logout = useCallback(async () => {
    abortFetch();

    try {
      await wallet.logout();
    } catch (error) {
      logger.error('Error logging out from wallet', 'useAuthActions', error);
    }

    dispatch({ type: 'LOGOUT' });
    await clearPersistedAuthState();

    // Clear NextAuth JWT cookie (no-op if not present)
    await nextAuthSignOut({ redirect: false }).catch(() => {
      // Ignore errors — cookie may not exist for Hive-only sessions
    });

    queryClient.clear();
  }, [wallet, dispatch, abortFetch]);

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
    loginWithWallet,
    logout,
    upgradeToHive,
    updateUser,
    setHiveUser,
  };
}
