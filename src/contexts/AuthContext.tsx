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
import { useGoogleAuthBridge } from './auth/useGoogleAuthBridge';
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

  // Bridge NextAuth Google session → AuthContext (one-shot after mount)
  useGoogleAuthBridge({ login, isAuthenticated: !!user, hasMounted });

  // ============================================================================
  // Session Restoration Effect
  // ============================================================================

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Check for UI hint to show loading state appropriately
        const uiHint = loadUIHint();

        // Fetch session from httpOnly cookie (the ONLY source of truth)
        const sessionResponse = await fetchSessionFromCookie();

        if (sessionResponse.authenticated && sessionResponse.session) {
          const {
            userId,
            username,
            authType: sessionAuthType,
            hiveUsername,
            loginAt: sessionLoginAt,
          } = sessionResponse.session;

          // Check if session is expired
          if (isSessionExpired(sessionLoginAt)) {
            logger.info('Session expired due to inactivity', 'AuthContext');
            await clearPersistedAuthState();
            dispatch({ type: 'SESSION_EXPIRED' });
            return;
          }

          // Validate session integrity: Hive sessions must have a hiveUsername
          if (sessionAuthType === 'hive' && !hiveUsername) {
            logger.warn('Invalid Hive session: missing hiveUsername', 'AuthContext');
            await clearPersistedAuthState();
            dispatch({ type: 'INVALID_SESSION' });
            return;
          }

          // Create basic user from session data
          const isHiveAuth = sessionAuthType === 'hive';
          const restoredUser: User = {
            id: userId,
            username: sessionAuthType === 'soft' && hiveUsername ? hiveUsername : username,
            displayName: uiHint?.displayHint || username,
            isHiveAuth: isHiveAuth,
            hiveUsername: hiveUsername,
            // Set Hive avatar immediately so it renders before async profile refresh
            avatar: isHiveAuth && hiveUsername ? getHiveAvatarUrl(hiveUsername) : undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const restoredHiveUser: HiveAuthUser | null = hiveUsername
            ? { username: hiveUsername, isAuthenticated: true }
            : null;

          // Schedule profile refresh for Hive users
          if (isHiveAuth) {
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

          // Refresh the session timestamp in cookie
          persistAuthState({
            user: restoredUser,
            authType: sessionAuthType,
            hiveUser: restoredHiveUser,
            loginAt: refreshedLoginAt,
          });
        } else {
          // No valid session - clear any legacy localStorage
          localStorage.removeItem(AUTH_STORAGE_KEY);
          dispatch({ type: 'CLIENT_MOUNTED' });
        }
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
    dispatch({ type: 'TOUCH_SESSION', payload: { loginAt: now } });
    persistAuthState({ user, authType, hiveUser, loginAt: now });
  }, [user, authType, hiveUser]);

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

  const value: AuthContextValue = {
    user,
    authType,
    isAuthenticated: !!user,
    isLoading,
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
