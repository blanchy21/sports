'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { logger } from '@/lib/logger';
import { User } from '@/types';
import { HiveAuthUser, UserAccountData } from '@/lib/shared/types';
import { fetchWithRetry } from '@/lib/utils/api-retry';

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
  fetchSessionFromCookie,
  loadUIHint,
} from './auth/auth-persistence';
import { authReducer } from './auth/auth-reducer';
import { useAuthActions } from './auth/useAuthActions';
import { useOAuthBridge } from './auth/useOAuthBridge';
import { createUserWithAccountData, getHiveAvatarUrl } from './auth/useAuthProfile';

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

  // Track if we need to refresh Hive account after mount
  const needsHiveRefresh = useRef(false);

  const { user, authType, hiveUser, isLoading, isClient, hasMounted, profileLoadFailed } =
    authState;

  // Getter for current state (used by actions hook)
  // Uses a ref so getState() always returns the latest values,
  // even when called from stale closures (e.g. async profile fetch callbacks)
  const stateRef = useRef({ user, authType, hiveUser });
  stateRef.current = { user, authType, hiveUser };
  const getState = useCallback(() => stateRef.current, []);

  // Auth actions (login, logout, upgrade)
  const {
    login,
    loginWithHiveUser,
    loginWithWallet,
    logout,
    upgradeToHive,
    updateUser,
    setHiveUser,
  } = useAuthActions({ dispatch, getState });

  // Bridge NextAuth OAuth session (Google, Twitter/X) → AuthContext (one-shot after mount)
  // isPending is true while the NextAuth session check is in-flight,
  // preventing premature "not authenticated" redirects on protected pages.
  const { isPending: isOAuthBridgePending } = useOAuthBridge({
    login,
    isAuthenticated: !!user,
    hasMounted,
  });

  // ============================================================================
  // Session Restoration Effect
  // ============================================================================

  useEffect(() => {
    const applySession = async (
      session: NonNullable<Awaited<ReturnType<typeof fetchSessionFromCookie>>['session']>,
      displayHint?: string
    ): Promise<boolean> => {
      const {
        userId,
        username,
        authType: sessionAuthType,
        hiveUsername,
        loginAt: sessionLoginAt,
        keysDownloaded,
      } = session;

      if (isSessionExpired(sessionLoginAt)) {
        logger.info('Session expired due to inactivity', 'AuthContext');
        await clearPersistedAuthState();
        dispatch({ type: 'SESSION_EXPIRED' });
        return false;
      }

      if (sessionAuthType === 'hive' && !hiveUsername) {
        logger.warn('Invalid Hive session: missing hiveUsername', 'AuthContext');
        await clearPersistedAuthState();
        dispatch({ type: 'INVALID_SESSION' });
        return false;
      }

      const isHiveAuth = sessionAuthType === 'hive';
      const restoredUser: User = {
        id: userId,
        username: sessionAuthType === 'soft' && hiveUsername ? hiveUsername : username,
        displayName: displayHint || username,
        isHiveAuth,
        hiveUsername,
        keysDownloaded,
        avatar: isHiveAuth && hiveUsername ? getHiveAvatarUrl(hiveUsername) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const restoredHiveUser: HiveAuthUser | null = hiveUsername
        ? { username: hiveUsername, isAuthenticated: true }
        : null;

      if (isHiveAuth || (keysDownloaded && hiveUsername)) {
        needsHiveRefresh.current = true;
      }

      const refreshedLoginAt = Date.now();

      dispatch({
        type: 'RESTORE_SESSION',
        payload: {
          user: restoredUser,
          authType: sessionAuthType,
          hiveUser: restoredHiveUser,
          loginAt: refreshedLoginAt,
        },
      });

      persistAuthState({
        user: restoredUser,
        authType: sessionAuthType,
        hiveUser: restoredHiveUser,
        loginAt: refreshedLoginAt,
      });

      return true;
    };

    const restoreSession = async () => {
      try {
        const uiHint = loadUIHint();

        // Fetch session from httpOnly cookie (the ONLY source of truth)
        const sessionResponse = await fetchSessionFromCookie();

        if (sessionResponse.networkError) {
          console.warn('Network error checking session, preserving auth state');
          dispatch({ type: 'CLIENT_MOUNTED' });
          return;
        }

        if (sessionResponse.authenticated && sessionResponse.session) {
          await applySession(sessionResponse.session, uiHint?.displayHint);
          return;
        }

        // If a UI hint says the user was recently logged in, retry once after
        // a short delay. This handles Keychain mobile app WebViews where the
        // session cookie may not be immediately available on the first fetch
        // (e.g., cookie jar sync delay after a page reload triggered by signing).
        if (uiHint?.wasLoggedIn) {
          logger.info(
            'Session cookie not found but UI hint says logged in — retrying',
            'AuthContext'
          );
          await new Promise((r) => setTimeout(r, 500));
          const retryResponse = await fetchSessionFromCookie();
          if (retryResponse.authenticated && retryResponse.session) {
            logger.info('Session restored on retry', 'AuthContext');
            await applySession(retryResponse.session, uiHint?.displayHint);
            return;
          }
          logger.warn('Session retry failed — logging out', 'AuthContext');
        }

        // No valid session - clear any legacy localStorage
        localStorage.removeItem(AUTH_STORAGE_KEY);
        dispatch({ type: 'CLIENT_MOUNTED' });
      } catch (error) {
        logger.error('Error restoring session from cookie', 'AuthContext', error);
        dispatch({ type: 'CLIENT_MOUNTED' });
      }
    };

    requestAnimationFrame(() => {
      void restoreSession();
    });
  }, []);

  // ============================================================================
  // Session Touch — refresh activity timestamp to prevent inactivity expiry
  // ============================================================================

  const touchSession = useCallback(() => {
    if (!user) return;
    const now = Date.now();
    dispatch({ type: 'TOUCH_SESSION', payload: { lastActivityAt: now } });
    persistAuthState({ user, authType, hiveUser, loginAt: authState.loginAt, lastActivityAt: now });
  }, [user, authType, hiveUser, authState.loginAt]);

  // ============================================================================
  // Activity Tracking — throttled touch on user interaction to prevent expiry
  // ============================================================================

  useEffect(() => {
    if (!user) return;

    const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
    let lastTouch = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastTouch >= THROTTLE_MS) {
        lastTouch = now;
        touchSession();
      }
    };

    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [user, touchSession]);

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
        persistAuthState({
          user: updatedUser,
          authType,
          hiveUser: updatedHiveUser,
          loginAt: now,
          displayName: updatedUser.displayName,
          avatar: updatedUser.avatar,
        });
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
          createdAt: account.createdAt ? new Date(String(account.createdAt)) : new Date(),
          lastPost: account.lastPost ? new Date(String(account.lastPost)) : undefined,
          lastVote: account.lastVote ? new Date(String(account.lastVote)) : undefined,
        };
        applyAccountData(accountData);
      }
    } catch (error) {
      logger.error('Error refreshing Hive account after retries', 'AuthContext', error);
    }
  }, [applyAccountData, hiveUser]);

  // Separate effect for Hive account refresh
  useEffect(() => {
    if (!isLoading && needsHiveRefresh.current) {
      needsHiveRefresh.current = false;
      refreshHiveAccount();
    }
  }, [isLoading, refreshHiveAccount]);

  // ============================================================================
  // Context Value
  // ============================================================================

  // Keep isLoading true while the Google auth bridge is still checking NextAuth session.
  // This prevents pages from seeing isLoading=false + user=null prematurely
  // and redirecting to landing before the Google session can be picked up.
  const effectiveIsLoading = isLoading || isOAuthBridgePending;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authType,
      isAuthenticated: !!user,
      isLoading: effectiveIsLoading,
      login,
      loginWithHiveUser,
      loginWithWallet,
      logout,
      updateUser,
      upgradeToHive,
      hiveUser,
      setHiveUser,
      refreshHiveAccount,
      touchSession,
      isClient,
      hasMounted,
      profileLoadFailed,
    }),
    [
      user,
      authType,
      effectiveIsLoading,
      login,
      loginWithHiveUser,
      loginWithWallet,
      logout,
      updateUser,
      upgradeToHive,
      hiveUser,
      setHiveUser,
      refreshHiveAccount,
      touchSession,
      isClient,
      hasMounted,
      profileLoadFailed,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
