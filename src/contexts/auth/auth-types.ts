import { AuthState, AuthType, User } from '@/types';
import { HiveAuthUser } from '@/lib/shared/types';
import type { AiohaRawLoginResult } from '@/lib/aioha/types';
import type { AuthUser } from '@/lib/firebase/auth';

// ============================================================================
// Constants
// ============================================================================

export const AUTH_STORAGE_KEY = 'authState';

/** Absolute session lifetime — cookie and client must agree */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Session considered inactive after 1 hour without user activity */
export const ACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

/** Debounce delay for persisting auth state */
export const PERSIST_DEBOUNCE_MS = 100;

// ============================================================================
// Auth Context Value
// ============================================================================

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
  /** Refresh the session activity timestamp to prevent inactivity expiry */
  touchSession: () => void;
  /** True if the last profile fetch failed - can be used to show a warning */
  profileLoadFailed: boolean;
}

// ============================================================================
// Internal State Types
// ============================================================================

export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Combined auth state to batch updates and reduce re-renders
 */
export interface AuthStateInternal {
  user: User | null;
  authType: AuthType;
  hiveUser: HiveAuthUser | null;
  loginAt: number | undefined;
  isLoading: boolean;
  isClient: boolean;
  hasMounted: boolean;
  profileLoadFailed: boolean;
}

export const initialAuthState: AuthStateInternal = {
  user: null,
  authType: 'guest',
  hiveUser: null,
  loginAt: undefined,
  isLoading: true,
  isClient: false,
  hasMounted: false,
  profileLoadFailed: false,
};
