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
import { AuthState, AuthType, User } from '@/types';
import { HiveAuthUser, HiveAccount } from '@/lib/shared/types';
import type { UserAccountData } from '@/lib/hive-workerbee/account';
import { useAioha } from '@/contexts/AiohaProvider';
import { AuthUser, FirebaseAuth } from '@/lib/firebase/auth';
import { parseAuthState } from '@/lib/validation/auth-schema';
import { setAuthInfo, clearAuthInfo } from '@/lib/api/authenticated-fetch';
import type { AiohaInstance, AiohaRawLoginResult, ExtractedAiohaUser } from '@/lib/aioha/types';
import { extractFromRawLoginResult, extractFromAiohaInstance } from '@/lib/aioha/types';

/**
 * Auth context value - exported for consumers
 */
export interface AuthContextValue extends AuthState {
  login: (user: User, authType: AuthType) => void;
  loginWithHiveUser: (hiveUsername: string) => Promise<void>;
  loginWithAioha: (loginResult?: AiohaRawLoginResult) => Promise<void>;
  loginWithFirebase: (authUser: AuthUser) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  upgradeToHive: (hiveUsername: string) => Promise<void>;
  hiveUser: HiveAuthUser | null;
  setHiveUser: (hiveUser: HiveAuthUser | null) => void;
  refreshHiveAccount: () => Promise<void>;
  isClient: boolean;
  hasMounted: boolean;
  /** True if the last profile fetch failed - can be used to show a warning */
  profileLoadFailed: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for UserAccountData
 * Validates that the object has the required shape for account data
 */
function isUserAccountData(data: unknown): data is UserAccountData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.username === 'string' &&
    typeof obj.reputation === 'number' &&
    typeof obj.liquidHiveBalance === 'number' &&
    typeof obj.liquidHbdBalance === 'number' &&
    typeof obj.hivePower === 'number' &&
    typeof obj.resourceCredits === 'number' &&
    obj.profile !== null &&
    typeof obj.profile === 'object' &&
    obj.stats !== null &&
    typeof obj.stats === 'object'
  );
}

/**
 * Type guard for checking if an API response contains valid account data
 */
function hasValidAccountData(
  result: unknown
): result is { success: true; account: UserAccountData } {
  if (!result || typeof result !== 'object') return false;
  const obj = result as Record<string, unknown>;
  return obj.success === true && isUserAccountData(obj.account);
}

const AUTH_STORAGE_KEY = 'authState';

// Session expires after 30 minutes of inactivity
const SESSION_DURATION_MS = 30 * 60 * 1000;

/**
 * Check if a session is expired based on loginAt timestamp
 */
function isSessionExpired(loginAt: number | undefined): boolean {
  if (!loginAt) return true;
  return Date.now() - loginAt > SESSION_DURATION_MS;
}

export const sanitizeHiveUserForStorage = (hiveUser: HiveAuthUser | null): HiveAuthUser | null => {
  if (!hiveUser) {
    return null;
  }

  const sanitizedHiveUser: HiveAuthUser = { ...hiveUser };
  delete sanitizedHiveUser.sessionId;
  delete sanitizedHiveUser.aiohaUserId;
  return sanitizedHiveUser;
};

// Debounce state for persistAuthState to prevent race conditions
let pendingPersistState: {
  user: User | null;
  authType: AuthType;
  hiveUser: HiveAuthUser | null;
  loginAt?: number;
} | null = null;
let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 100;

/**
 * Actually perform the localStorage write
 */
const executePersist = () => {
  if (!pendingPersistState || typeof window === 'undefined') {
    return;
  }

  const {
    user: userToPersist,
    authType: authTypeToPersist,
    hiveUser: hiveUserToPersist,
    loginAt: loginAtToPersist,
  } = pendingPersistState;
  pendingPersistState = null;

  const sanitizedState = {
    user: userToPersist,
    authType: authTypeToPersist,
    hiveUser: sanitizeHiveUserForStorage(hiveUserToPersist),
    loginAt: loginAtToPersist ?? Date.now(),
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sanitizedState));
  } catch (error) {
    logger.error('Error persisting auth state', 'AuthContext', error);
  }

  // Sync auth info for authenticated API calls
  if (userToPersist) {
    setAuthInfo({
      userId: userToPersist.id,
      username: userToPersist.username,
    });

    // Also sync to httpOnly cookie for server-side validation
    syncSessionCookie({
      userId: userToPersist.id,
      username: userToPersist.username,
      authType: authTypeToPersist,
      hiveUsername: hiveUserToPersist?.username,
    });
  } else {
    clearAuthInfo();
    clearSessionCookie();
  }
};

/**
 * Persist auth state to localStorage with debouncing to prevent race conditions.
 * Multiple rapid calls will be coalesced into a single write.
 */
const persistAuthState = ({
  user: userToPersist,
  authType: authTypeToPersist,
  hiveUser: hiveUserToPersist,
  loginAt: loginAtToPersist,
}: {
  user: User | null;
  authType: AuthType;
  hiveUser: HiveAuthUser | null;
  loginAt?: number;
}) => {
  // Only persist on client-side
  if (typeof window === 'undefined') {
    return;
  }

  // Store the latest state to persist
  pendingPersistState = {
    user: userToPersist,
    authType: authTypeToPersist,
    hiveUser: hiveUserToPersist,
    loginAt: loginAtToPersist,
  };

  // Clear any existing timer
  if (persistDebounceTimer) {
    clearTimeout(persistDebounceTimer);
  }

  // Set new timer to execute persist after debounce period
  persistDebounceTimer = setTimeout(() => {
    persistDebounceTimer = null;
    executePersist();
  }, PERSIST_DEBOUNCE_MS);
};

/**
 * Sync session to httpOnly cookie for server-side validation
 */
const syncSessionCookie = async (sessionData: {
  userId: string;
  username: string;
  authType: AuthType;
  hiveUsername?: string;
}) => {
  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
  } catch (error) {
    logger.error('Error syncing session cookie', 'AuthContext', error);
  }
};

/**
 * Clear session cookie on logout
 */
const clearSessionCookie = async () => {
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch (error) {
    logger.error('Error clearing session cookie', 'AuthContext', error);
  }
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Combined auth state to batch updates and reduce re-renders
interface AuthStateInternal {
  user: User | null;
  authType: AuthType;
  hiveUser: HiveAuthUser | null;
  loginAt: number | undefined;
  isLoading: boolean;
  isClient: boolean;
  hasMounted: boolean;
  profileLoadFailed: boolean;
}

const initialAuthState: AuthStateInternal = {
  user: null,
  authType: 'guest',
  hiveUser: null,
  loginAt: undefined,
  isLoading: true,
  isClient: false,
  hasMounted: false,
  profileLoadFailed: false,
};

// ============================================================================
// Reducer Actions - Explicit state transitions for debugging and testing
// ============================================================================

type AuthAction =
  | {
      type: 'RESTORE_SESSION';
      payload: {
        user: User | null;
        authType: AuthType;
        hiveUser: HiveAuthUser | null;
        loginAt: number;
      };
    }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'INVALID_SESSION' }
  | { type: 'CLIENT_MOUNTED' }
  | {
      type: 'LOGIN';
      payload: { user: User; authType: AuthType; hiveUser: HiveAuthUser | null; loginAt: number };
    }
  | { type: 'LOGIN_PROFILE_LOADED'; payload: { user: User; hiveUser: HiveAuthUser } }
  | { type: 'LOGIN_PROFILE_FAILED' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: { user: User; loginAt: number } }
  | { type: 'UPDATE_HIVE_USER'; payload: HiveAuthUser | null }
  | { type: 'REFRESH_ACCOUNT'; payload: { user: User; hiveUser: HiveAuthUser; loginAt: number } };

function authReducer(state: AuthStateInternal, action: AuthAction): AuthStateInternal {
  // Enable action logging in development for debugging
  if (process.env.NODE_ENV === 'development') {
    logger.debug(action.type, 'AuthReducer', 'payload' in action ? action.payload : undefined);
  }

  switch (action.type) {
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        authType: action.payload.authType,
        hiveUser: action.payload.hiveUser,
        loginAt: action.payload.loginAt,
        isClient: true,
        hasMounted: true,
        isLoading: false,
        profileLoadFailed: false,
      };

    case 'SESSION_EXPIRED':
    case 'INVALID_SESSION':
      return {
        ...state,
        isClient: true,
        hasMounted: true,
        isLoading: false,
      };

    case 'CLIENT_MOUNTED':
      return {
        ...state,
        isClient: true,
        hasMounted: true,
        isLoading: false,
      };

    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        authType: action.payload.authType,
        hiveUser: action.payload.hiveUser,
        loginAt: action.payload.loginAt,
        profileLoadFailed: false,
      };

    case 'LOGIN_PROFILE_LOADED':
      return {
        ...state,
        user: action.payload.user,
        hiveUser: action.payload.hiveUser,
      };

    case 'LOGIN_PROFILE_FAILED':
      return {
        ...state,
        profileLoadFailed: true,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        authType: 'guest',
        hiveUser: null,
        loginAt: undefined,
        profileLoadFailed: false,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload.user,
        loginAt: action.payload.loginAt,
      };

    case 'UPDATE_HIVE_USER':
      return {
        ...state,
        hiveUser: action.payload,
      };

    case 'REFRESH_ACCOUNT':
      return {
        ...state,
        user: action.payload.user,
        hiveUser: action.payload.hiveUser,
        loginAt: action.payload.loginAt,
      };

    default:
      return state;
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // useReducer provides explicit state transitions for better debugging
  const [authState, dispatch] = useReducer(authReducer, initialAuthState);
  const { aioha, isInitialized } = useAioha();

  // Track if we need to refresh Hive account after mount
  const needsHiveRefresh = React.useRef(false);

  // AbortController for cancelling in-flight profile fetch requests
  const profileFetchController = useRef<AbortController | null>(null);

  // Destructure for easier access (these are derived, not separate state)
  const { user, authType, hiveUser, isLoading, isClient, hasMounted, profileLoadFailed } =
    authState;

  // Wrapper for setHiveUser to maintain API compatibility
  const setHiveUser = useCallback((newHiveUser: HiveAuthUser | null) => {
    dispatch({ type: 'UPDATE_HIVE_USER', payload: newHiveUser });
  }, []);

  useEffect(() => {
    // Use requestAnimationFrame to batch state updates after paint
    // This prevents visible flash by deferring state changes
    requestAnimationFrame(() => {
      // Check for existing auth state in localStorage with validation
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

      if (savedAuth) {
        const validatedState = parseAuthState(savedAuth);
        if (validatedState) {
          const {
            user: savedUser,
            authType: savedAuthType,
            hiveUser: savedHiveUser,
            loginAt: savedLoginAt,
          } = validatedState;

          // Check if session has expired (30 minutes of inactivity)
          if (isSessionExpired(savedLoginAt)) {
            // Session expired - clear auth state
            localStorage.removeItem(AUTH_STORAGE_KEY);
            logger.info('Session expired after 30 minutes of inactivity', 'AuthContext');
            dispatch({ type: 'SESSION_EXPIRED' });
            return;
          }

          // Session is still valid - restore state
          const restoredUser = savedUser
            ? ({
                ...savedUser,
                isHiveAuth: savedUser.isHiveAuth ?? false,
              } as User)
            : null;

          const restoredHiveUser = savedHiveUser
            ? ({
                ...savedHiveUser,
                isAuthenticated: savedHiveUser.isAuthenticated ?? true,
              } as HiveAuthUser)
            : null;

          // Mark that we need to refresh Hive account if profile data is missing
          if (savedAuthType === 'hive' && savedUser && !savedUser.hiveProfile) {
            needsHiveRefresh.current = true;
          }

          // Refresh loginAt to extend the session (user is active)
          const refreshedLoginAt = Date.now();

          // Dispatch RESTORE_SESSION action
          dispatch({
            type: 'RESTORE_SESSION',
            payload: {
              user: restoredUser,
              authType: savedAuthType,
              hiveUser: restoredHiveUser,
              loginAt: refreshedLoginAt,
            },
          });

          // Persist the refreshed loginAt to localStorage
          persistAuthState({
            user: restoredUser,
            authType: savedAuthType,
            hiveUser: restoredHiveUser,
            loginAt: refreshedLoginAt,
          });
        } else {
          // Invalid auth state - clear corrupted data
          localStorage.removeItem(AUTH_STORAGE_KEY);
          logger.warn('Cleared invalid auth state from localStorage', 'AuthContext');
          dispatch({ type: 'INVALID_SESSION' });
        }
      } else {
        // No saved auth - just mark as loaded
        dispatch({ type: 'CLIENT_MOUNTED' });
      }
    });
  }, []);

  // Separate effect for Hive account refresh to avoid calling before it's defined
  useEffect(() => {
    if (!isLoading && needsHiveRefresh.current) {
      needsHiveRefresh.current = false;
      refreshHiveAccount();
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Save to localStorage with new login timestamp
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
      payload: {
        user: newUser,
        authType: newAuthType,
        hiveUser: newHiveUser,
        loginAt: now,
      },
    });

    // Save to localStorage
    persistAuthState({
      user: newUser,
      authType: newAuthType,
      hiveUser: newHiveUser,
      loginAt: now,
    });
  }, []);

  const loginWithHiveUser = useCallback(async (hiveUsername: string) => {
    try {
      const now = Date.now();
      // Create basic user object first
      const basicUser: User = {
        id: hiveUsername,
        username: hiveUsername,
        displayName: hiveUsername,
        isHiveAuth: true,
        hiveUsername: hiveUsername,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create Hive user object
      const newHiveUser: HiveAuthUser = {
        username: hiveUsername,
        isAuthenticated: true,
      };

      // Dispatch LOGIN action for immediate UI responsiveness
      dispatch({
        type: 'LOGIN',
        payload: {
          user: basicUser,
          authType: 'hive',
          hiveUser: newHiveUser,
          loginAt: now,
        },
      });

      persistAuthState({
        user: basicUser,
        authType: 'hive',
        hiveUser: newHiveUser,
        loginAt: now,
      });

      // PERFORMANCE: Defer profile fetch to background - don't block login/redirect
      // Cancel any previous in-flight request
      profileFetchController.current?.abort();
      profileFetchController.current = new AbortController();
      const controller = profileFetchController.current;

      setTimeout(async () => {
        try {
          const response = await fetch(
            `/api/hive/account/summary?username=${encodeURIComponent(hiveUsername)}`,
            { signal: controller.signal }
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch account: ${response.status}`);
          }
          const result = await response.json();

          if (hasValidAccountData(result)) {
            const accountData = result.account;
            // Update hiveUser with account data
            const updatedHiveUser = {
              ...newHiveUser,
              account: accountData as unknown as HiveAccount,
            };

            // Update the main user object with Hive profile data
            const updatedUser = {
              ...basicUser,
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
              avatar: accountData.profile.profileImage,
              displayName: accountData.profile.name || hiveUsername,
              bio: accountData.profile.about,
              createdAt: accountData.createdAt,
            };

            // Dispatch profile loaded action
            dispatch({
              type: 'LOGIN_PROFILE_LOADED',
              payload: { user: updatedUser, hiveUser: updatedHiveUser },
            });

            // Save updated state to localStorage (keep same loginAt)
            persistAuthState({
              user: updatedUser,
              authType: 'hive',
              hiveUser: updatedHiveUser,
              loginAt: now,
            });
          }
        } catch (profileError) {
          // Ignore abort errors (expected when user logs out during fetch)
          if (profileError instanceof Error && profileError.name === 'AbortError') {
            return;
          }
          logger.error('Error fetching Hive account data', 'AuthContext', profileError);
          // Flag the failure
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

        // Step 1: Try to extract from login result
        if (loginResult) {
          extracted = extractFromRawLoginResult(loginResult);
        }

        // Step 2: Try to extract from Aioha instance
        if (!extracted) {
          extracted = extractFromAiohaInstance(aiohaInstance);
        }

        // Step 3: Try with retries (Aioha may need time to process)
        if (!extracted && loginResult) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
            extracted = extractFromAiohaInstance(aiohaInstance);
            if (extracted) break;
          }
        }

        // Step 4: Try getUser method if available
        if (!extracted && typeof aiohaInstance.getUser === 'function') {
          try {
            const getUserResult = await aiohaInstance.getUser();
            if (getUserResult?.username) {
              extracted = { username: getUserResult.username, sessionId: getUserResult.sessionId };
            }
          } catch {
            // getUser failed, continue to next fallback
          }
        }

        // Step 5: Try localStorage fallback
        if (!extracted && typeof window !== 'undefined') {
          const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
          if (storedAuth) {
            try {
              const parsed = JSON.parse(storedAuth);
              if (parsed.hiveUser?.username) {
                extracted = { username: parsed.hiveUser.username };
              }
            } catch {
              // localStorage parse failed
            }
          }
        }

        // If we still have nothing, throw
        if (!extracted) {
          throw new Error(
            'Unable to determine username from Aioha authentication. Please try again.'
          );
        }

        const { username, sessionId } = extracted;
        const now = Date.now();

        // Create user objects
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

        // Dispatch LOGIN action for immediate UI responsiveness
        dispatch({
          type: 'LOGIN',
          payload: {
            user: basicUser,
            authType: 'hive',
            hiveUser: newHiveUser,
            loginAt: now,
          },
        });

        persistAuthState({
          user: basicUser,
          authType: 'hive',
          hiveUser: newHiveUser,
          loginAt: now,
        });

        // PERFORMANCE: Defer profile fetch to background - don't block login/redirect
        // Cancel any previous in-flight request
        profileFetchController.current?.abort();
        profileFetchController.current = new AbortController();
        const controller = profileFetchController.current;

        setTimeout(async () => {
          try {
            const response = await fetch(
              `/api/hive/account/summary?username=${encodeURIComponent(username)}`,
              { signal: controller.signal }
            );
            if (!response.ok) {
              throw new Error(`Failed to fetch account: ${response.status}`);
            }
            const result = await response.json();

            if (hasValidAccountData(result)) {
              const accountData = result.account;
              const updatedHiveUser: HiveAuthUser = {
                ...newHiveUser,
                account: accountData as unknown as HiveAccount,
              };

              const updatedUser: User = {
                ...basicUser,
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
                avatar: accountData.profile.profileImage,
                displayName: accountData.profile.name ?? username,
                bio: accountData.profile.about,
                createdAt: accountData.createdAt,
              };

              // Dispatch profile loaded action
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
            // Ignore abort errors (expected when user logs out during fetch)
            if (profileError instanceof Error && profileError.name === 'AbortError') {
              return;
            }
            logger.error('Error fetching Hive account data', 'AuthContext', profileError);
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

  const logout = useCallback(async () => {
    // Cancel any in-flight profile fetch requests to prevent stale updates
    profileFetchController.current?.abort();
    profileFetchController.current = null;

    // Logout from Aioha if user was authenticated via Aioha
    if (hiveUser?.provider && aioha) {
      try {
        const aiohaInstance = aioha as AiohaInstance;
        if (aiohaInstance.logout) {
          await aiohaInstance.logout();
        }
      } catch (error) {
        logger.error('Error logging out from Aioha', 'AuthContext', error);
      }
    }

    // Logout from Firebase if user was authenticated via Firebase
    if (authType === 'soft') {
      try {
        await FirebaseAuth.signOut();
      } catch (error) {
        logger.error('Error logging out from Firebase', 'AuthContext', error);
      }
    }

    // Dispatch LOGOUT action
    dispatch({ type: 'LOGOUT' });

    // Only remove from localStorage on client-side
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (error) {
        logger.error('Error removing auth state from localStorage', 'AuthContext', error);
      }
    }
  }, [aioha, authType, hiveUser?.provider]);

  const upgradeToHive = useCallback(
    async (hiveUsername: string) => {
      if (!user || authType !== 'soft') {
        throw new Error('User must be logged in with a soft account to upgrade');
      }

      try {
        const now = Date.now();
        // Update Firebase profile to mark as Hive user
        await FirebaseAuth.upgradeToHive(user.id, hiveUsername);

        // Update local user state
        const updatedUser = {
          ...user,
          isHiveAuth: true,
          hiveUsername: hiveUsername,
        };

        // Create Hive user object
        const newHiveUser: HiveAuthUser = {
          username: hiveUsername,
          isAuthenticated: true,
        };

        // Dispatch LOGIN action for upgrade
        dispatch({
          type: 'LOGIN',
          payload: {
            user: updatedUser,
            authType: 'hive',
            hiveUser: newHiveUser,
            loginAt: now,
          },
        });

        persistAuthState({
          user: updatedUser,
          authType: 'hive',
          hiveUser: newHiveUser,
          loginAt: now,
        });

        // Fetch Hive account data
        try {
          const response = await fetch(
            `/api/hive/account/summary?username=${encodeURIComponent(hiveUsername)}`
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch account: ${response.status}`);
          }
          const result = await response.json();

          if (hasValidAccountData(result)) {
            const accountData = result.account;
            const updatedHiveUser = {
              ...newHiveUser,
              account: accountData as unknown as HiveAccount,
            };

            const userWithHiveData = {
              ...updatedUser,
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
              avatar: accountData.profile.profileImage || user.avatar,
              displayName: accountData.profile.name || user.displayName,
              bio: accountData.profile.about || user.bio,
              createdAt: accountData.createdAt,
            };

            // Dispatch profile loaded action
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
          logger.error('Error fetching Hive account data', 'AuthContext', profileError);
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

        dispatch({
          type: 'UPDATE_USER',
          payload: { user: updatedUser, loginAt: now },
        });

        persistAuthState({
          user: updatedUser,
          authType,
          hiveUser,
          loginAt: now,
        });
      }
    },
    [authType, hiveUser, user]
  );

  const applyAccountData = useCallback(
    (accountData: UserAccountData) => {
      if (!hiveUser) {
        return;
      }

      // Update hiveUser with account data
      const updatedHiveUser: HiveAuthUser = {
        ...hiveUser,
        username: hiveUser.username,
        account: accountData as unknown as HiveAccount,
      };

      // Also update the main user object with Hive profile data
      if (user) {
        const updatedUser = {
          ...user,
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
          avatar: accountData.profile.profileImage || user.avatar,
          displayName: accountData.profile.name || user.displayName,
          bio: accountData.profile.about || user.bio,
          createdAt: accountData.createdAt,
        };

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
        });
      } else {
        // Only update hiveUser if no user
        dispatch({ type: 'UPDATE_HIVE_USER', payload: updatedHiveUser });
      }
    },
    [authType, hiveUser, user]
  );

  const refreshHiveAccount = useCallback(async () => {
    if (!hiveUser?.username) {
      return;
    }

    try {
      let accountData: UserAccountData | null = null;

      // Always use API route since this is a client component
      const response = await fetch(
        `/api/hive/account/summary?username=${encodeURIComponent(hiveUser.username)}`
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          (payload as { error?: string }).error ||
            `Failed to refresh Hive account: ${response.status}`
        );
      }
      const result = await response.json();
      if (hasValidAccountData(result)) {
        const { account } = result;
        // Convert date strings from JSON to Date objects
        accountData = {
          ...account,
          createdAt: account.createdAt
            ? new Date(account.createdAt as unknown as string)
            : new Date(),
          lastPost: account.lastPost ? new Date(String(account.lastPost)) : undefined,
          lastVote: account.lastVote ? new Date(String(account.lastVote)) : undefined,
        };
      }

      if (accountData) {
        applyAccountData(accountData);
      }
    } catch (error) {
      logger.error('Error refreshing Hive account', 'AuthContext', error);
    }
  }, [applyAccountData, hiveUser]);

  const value = {
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
