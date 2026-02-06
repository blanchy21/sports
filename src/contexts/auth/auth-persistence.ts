import { AuthType } from '@/types';
import { User } from '@/types';
import { HiveAuthUser } from '@/lib/shared/types';
import { logger } from '@/lib/logger';
import { setAuthInfo, clearAuthInfo } from '@/lib/api/authenticated-fetch';
import { AUTH_STORAGE_KEY, ACTIVITY_TIMEOUT_MS, PERSIST_DEBOUNCE_MS } from './auth-types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Key for storing non-sensitive UI hints in localStorage.
 * This is NOT used for authentication - only for hydration hints.
 */
const UI_HINT_STORAGE_KEY = 'authHint';

// ============================================================================
// Session Expiration
// ============================================================================

/**
 * Check if a session is inactive based on loginAt timestamp.
 * loginAt is refreshed on every significant user action (post, comment, page load),
 * so this effectively measures inactivity rather than absolute session age.
 */
export function isSessionExpired(loginAt: number | undefined): boolean {
  if (!loginAt) return true;
  return Date.now() - loginAt > ACTIVITY_TIMEOUT_MS;
}

// ============================================================================
// Sanitization
// ============================================================================

/**
 * Sanitize HiveUser for storage by removing sensitive session data
 */
export const sanitizeHiveUserForStorage = (hiveUser: HiveAuthUser | null): HiveAuthUser | null => {
  if (!hiveUser) {
    return null;
  }

  const sanitizedHiveUser: HiveAuthUser = { ...hiveUser };
  delete sanitizedHiveUser.sessionId;
  delete sanitizedHiveUser.aiohaUserId;
  return sanitizedHiveUser;
};

// ============================================================================
// Session Cookie API
// ============================================================================

export interface SessionResponse {
  success: boolean;
  authenticated: boolean;
  session: {
    userId: string;
    username: string;
    authType: AuthType;
    hiveUsername?: string;
    loginAt?: number;
  } | null;
}

/**
 * Fetch session from httpOnly cookie via server API.
 * This is the ONLY source of truth for authentication state.
 */
export const fetchSessionFromCookie = async (): Promise<SessionResponse> => {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return { success: false, authenticated: false, session: null };
    }

    return await response.json();
  } catch (error) {
    logger.error('Error fetching session from cookie', 'AuthPersistence', error);
    return { success: false, authenticated: false, session: null };
  }
};

/**
 * Sync session to httpOnly cookie for server-side validation.
 * This is the PRIMARY storage for auth state.
 */
export const syncSessionCookie = async (sessionData: {
  userId: string;
  username: string;
  authType: AuthType;
  hiveUsername?: string;
  loginAt?: number;
}): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(sessionData),
    });
    return response.ok;
  } catch (error) {
    logger.error('Error syncing session cookie', 'AuthPersistence', error);
    return false;
  }
};

/**
 * Clear session cookie on logout
 */
export const clearSessionCookie = async (): Promise<void> => {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch (error) {
    logger.error('Error clearing session cookie', 'AuthPersistence', error);
  }
};

// ============================================================================
// UI Hint Storage (Non-Sensitive)
// ============================================================================

interface UIHint {
  /** Hint that user was logged in - used for hydration, NOT authentication */
  wasLoggedIn: boolean;
  /** Display name hint for UI only */
  displayHint?: string;
  /** Auth type hint for UI skeleton */
  authTypeHint?: AuthType;
}

/**
 * Save a non-sensitive UI hint to localStorage for hydration purposes.
 * This does NOT contain any authentication data - just hints for
 * showing appropriate loading states.
 */
export const saveUIHint = (hint: UIHint): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(UI_HINT_STORAGE_KEY, JSON.stringify(hint));
  } catch (error) {
    logger.warn('Error saving UI hint', 'AuthPersistence', error);
  }
};

/**
 * Load UI hint from localStorage.
 * Returns null if no hint exists or it's invalid.
 */
export const loadUIHint = (): UIHint | null => {
  if (typeof window === 'undefined') return null;

  try {
    const hint = localStorage.getItem(UI_HINT_STORAGE_KEY);
    if (!hint) return null;

    const parsed = JSON.parse(hint);
    if (typeof parsed.wasLoggedIn !== 'boolean') return null;

    return parsed as UIHint;
  } catch {
    return null;
  }
};

/**
 * Clear UI hint from localStorage
 */
export const clearUIHint = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(UI_HINT_STORAGE_KEY);
  } catch {
    // Ignore errors clearing hint
  }
};

// ============================================================================
// Debounced Persistence (to httpOnly Cookies)
// ============================================================================

// Debounce state for persistAuthState to prevent race conditions
let pendingPersistState: {
  user: User | null;
  authType: AuthType;
  hiveUser: HiveAuthUser | null;
  loginAt?: number;
} | null = null;

let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Actually perform the session persistence to httpOnly cookie
 */
const executePersist = async (): Promise<void> => {
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

  // Sync auth info for authenticated API calls (in-memory)
  if (userToPersist) {
    setAuthInfo({
      userId: userToPersist.id,
      username: userToPersist.username,
    });

    // PRIMARY: Sync to httpOnly cookie for server-side validation
    await syncSessionCookie({
      userId: userToPersist.id,
      username: userToPersist.username,
      authType: authTypeToPersist,
      hiveUsername: hiveUserToPersist?.username,
      loginAt: loginAtToPersist ?? Date.now(),
    });

    // SECONDARY: Save non-sensitive UI hint for hydration
    saveUIHint({
      wasLoggedIn: true,
      displayHint: userToPersist.displayName || userToPersist.username,
      authTypeHint: authTypeToPersist,
    });
  } else {
    clearAuthInfo();
    await clearSessionCookie();
    clearUIHint();
  }
};

/**
 * Persist auth state to httpOnly cookie with debouncing to prevent race conditions.
 * Multiple rapid calls will be coalesced into a single write.
 *
 * NOTE: Auth state is now stored in httpOnly cookies (not localStorage)
 * for XSS protection. The user object and hiveUser are only used to
 * extract session info for the cookie.
 */
export const persistAuthState = ({
  user: userToPersist,
  authType: authTypeToPersist,
  hiveUser: hiveUserToPersist,
  loginAt: loginAtToPersist,
}: {
  user: User | null;
  authType: AuthType;
  hiveUser: HiveAuthUser | null;
  loginAt?: number;
}): void => {
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
    void executePersist();
  }, PERSIST_DEBOUNCE_MS);
};

/**
 * Clear auth state completely (both cookie and localStorage hints)
 */
export const clearPersistedAuthState = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    try {
      // Clear legacy localStorage (migration cleanup)
      localStorage.removeItem(AUTH_STORAGE_KEY);
      // Clear UI hints
      clearUIHint();
    } catch (error) {
      logger.error('Error removing auth state from localStorage', 'AuthPersistence', error);
    }
  }
  // Clear httpOnly cookie
  await clearSessionCookie();
};

/**
 * @deprecated Use fetchSessionFromCookie() instead.
 * This is kept for backwards compatibility during migration.
 * Returns null - auth state is now in httpOnly cookies.
 */
export const loadPersistedAuthState = (): string | null => {
  // Legacy localStorage is no longer the source of truth
  // Return null to trigger cookie-based session restoration
  return null;
};
