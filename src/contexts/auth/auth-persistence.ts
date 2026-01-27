import { AuthType } from '@/types';
import { User } from '@/types';
import { HiveAuthUser } from '@/lib/shared/types';
import { logger } from '@/lib/logger';
import { setAuthInfo, clearAuthInfo } from '@/lib/api/authenticated-fetch';
import { AUTH_STORAGE_KEY, SESSION_DURATION_MS, PERSIST_DEBOUNCE_MS } from './auth-types';

// ============================================================================
// Session Expiration
// ============================================================================

/**
 * Check if a session is expired based on loginAt timestamp
 */
export function isSessionExpired(loginAt: number | undefined): boolean {
  if (!loginAt) return true;
  return Date.now() - loginAt > SESSION_DURATION_MS;
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
// Cookie Sync
// ============================================================================

/**
 * Sync session to httpOnly cookie for server-side validation
 */
export const syncSessionCookie = async (sessionData: {
  userId: string;
  username: string;
  authType: AuthType;
  hiveUsername?: string;
}): Promise<void> => {
  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
  } catch (error) {
    logger.error('Error syncing session cookie', 'AuthPersistence', error);
  }
};

/**
 * Clear session cookie on logout
 */
export const clearSessionCookie = async (): Promise<void> => {
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch (error) {
    logger.error('Error clearing session cookie', 'AuthPersistence', error);
  }
};

// ============================================================================
// Debounced Persistence
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
 * Actually perform the localStorage write
 */
const executePersist = (): void => {
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
    logger.error('Error persisting auth state', 'AuthPersistence', error);
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
    executePersist();
  }, PERSIST_DEBOUNCE_MS);
};

/**
 * Clear auth state from localStorage
 */
export const clearPersistedAuthState = (): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      logger.error('Error removing auth state from localStorage', 'AuthPersistence', error);
    }
  }
};

/**
 * Load auth state from localStorage
 */
export const loadPersistedAuthState = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(AUTH_STORAGE_KEY);
};
