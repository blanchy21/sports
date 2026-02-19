/**
 * Aioha SDK Type Definitions
 *
 * Strict TypeScript types for the Aioha authentication library.
 * Uses discriminated unions for type-safe result handling.
 */

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Supported authentication providers in Aioha
 */
export type AiohaProvider = 'keychain' | 'hivesigner' | 'hiveauth' | 'ledger' | 'peakvault';

/**
 * Provider-specific session data
 */
export interface AiohaSessionData {
  sessionId?: string;
  session_id?: string;
  session?: string;
  expiry?: number;
  provider: AiohaProvider;
}

// ============================================================================
// Login Result Types - Discriminated Unions
// ============================================================================

/**
 * Successful login result
 */
export interface AiohaLoginSuccess {
  success: true;
  username: string;
  provider: AiohaProvider;
  sessionId?: string;
  account?: {
    name: string;
    reputation?: number;
  };
}

/**
 * Failed login result with error details
 */
export interface AiohaLoginFailure {
  success: false;
  error: string;
  errorCode?: number;
  provider?: AiohaProvider;
}

/**
 * Cancelled login (user dismissed modal)
 */
export interface AiohaLoginCancelled {
  success: false;
  cancelled: true;
  provider?: AiohaProvider;
}

/**
 * Discriminated union of all login result types
 */
export type AiohaLoginResult = AiohaLoginSuccess | AiohaLoginFailure | AiohaLoginCancelled;

/**
 * Type guard for successful login
 */
export function isAiohaLoginSuccess(result: AiohaLoginResult): result is AiohaLoginSuccess {
  return result.success === true;
}

/**
 * Type guard for failed login
 */
export function isAiohaLoginFailure(result: AiohaLoginResult): result is AiohaLoginFailure {
  return result.success === false && !('cancelled' in result && result.cancelled);
}

/**
 * Type guard for cancelled login
 */
export function isAiohaLoginCancelled(result: AiohaLoginResult): result is AiohaLoginCancelled {
  return result.success === false && 'cancelled' in result && result.cancelled === true;
}

// ============================================================================
// Raw Aioha Response Types (what the library actually returns)
// ============================================================================

/**
 * Raw login result from Aioha library (various shapes)
 * This interface covers the many possible shapes returned by different providers
 */
export interface AiohaRawLoginResult {
  // Direct properties
  username?: string;
  name?: string;
  id?: string;
  session?: string;
  session_id?: string;
  sessionId?: string;
  provider?: string;
  errorCode?: number;
  error?: string;
  cancelled?: boolean;

  // Nested user object
  user?: {
    username?: string;
    name?: string;
    session?: string;
    sessionId?: string;
    session_id?: string;
  };

  // Nested account object
  account?: {
    name?: string;
    username?: string;
  };

  // Various other nested structures providers might return
  data?: { username?: string; name?: string };
  result?: { username?: string; name?: string };
  auth?: { username?: string; name?: string };
  profile?: { username?: string; name?: string };
  identity?: { username?: string; name?: string };
  accountData?: { username?: string; name?: string };
}

// ============================================================================
// Aioha Instance Types
// ============================================================================

/**
 * User state stored in Aioha instance
 */
export interface AiohaUserState {
  username?: string;
  sessionId?: string;
  session_id?: string;
}

/**
 * Provider state within Aioha
 */
export interface AiohaProviderState {
  user?: AiohaUserState;
  username?: string;
  sessionId?: string;
  session_id?: string;
  account?: { name?: string };
}

/**
 * Aioha SDK instance interface
 */
export interface AiohaInstance {
  // User state
  user?: AiohaUserState;
  currentUser?: AiohaUserState;
  username?: string;
  sessionId?: string;
  session_id?: string;

  // Account data
  account?: { name?: string };

  // Provider state
  currentProvider?: AiohaProvider;
  providers?: Record<AiohaProvider, AiohaProviderState>;

  // Internal state (used for fallback extraction)
  state?: { user?: AiohaUserState };
  _state?: { user?: AiohaUserState };

  // Methods
  getUser?: () => Promise<{ username?: string; id?: string; sessionId?: string }>;
  logout?: () => Promise<void>;
  login?: (
    provider: AiohaProvider | unknown,
    username?: string,
    options?: unknown
  ) => Promise<AiohaRawLoginResult>;

  // Transaction broadcasting
  signAndBroadcastTx?: (ops: unknown[], keyType: string) => Promise<unknown>;

  // Provider discovery
  getProviders?: () => string[];
  getCurrentUser?: () => string | undefined;

  // Multi-account support
  getOtherLogins?: () => Record<string, string>;
  switchUser?: (username: string) => boolean;

  // Event system
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler?: (...args: unknown[]) => void) => void;
}

// ============================================================================
// Extraction Utilities
// ============================================================================

/**
 * Extracted user data from various Aioha response shapes
 */
export interface ExtractedAiohaUser {
  username: string;
  sessionId?: string;
  provider?: AiohaProvider;
}

/**
 * Safely get a trimmed string value
 */
function getTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Extract session ID from various property names
 */
function extractSessionId(obj: unknown): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined;
  const record = obj as Record<string, unknown>;
  return (
    getTrimmedString(record.sessionId) ??
    getTrimmedString(record.session_id) ??
    getTrimmedString(record.session)
  );
}

/**
 * Extract username from raw Aioha login result
 * Handles the various shapes different providers return
 */
export function extractFromRawLoginResult(result: AiohaRawLoginResult): ExtractedAiohaUser | null {
  // Try direct properties first
  const directUsername = getTrimmedString(result.username) ?? getTrimmedString(result.name);
  if (directUsername) {
    return {
      username: directUsername,
      sessionId: extractSessionId(result),
      provider: result.provider as AiohaProvider | undefined,
    };
  }

  // Try nested user object
  if (result.user) {
    const userUsername =
      getTrimmedString(result.user.username) ?? getTrimmedString(result.user.name);
    if (userUsername) {
      return {
        username: userUsername,
        sessionId: extractSessionId(result.user),
        provider: result.provider as AiohaProvider | undefined,
      };
    }
  }

  // Try account object
  if (result.account) {
    const accountUsername =
      getTrimmedString(result.account.name) ?? getTrimmedString(result.account.username);
    if (accountUsername) {
      return {
        username: accountUsername,
        sessionId: extractSessionId(result),
        provider: result.provider as AiohaProvider | undefined,
      };
    }
  }

  // Try other common nested structures
  const nestedSources = [
    result.data,
    result.result,
    result.auth,
    result.profile,
    result.identity,
    result.accountData,
  ];
  for (const source of nestedSources) {
    if (source) {
      const username = getTrimmedString(source.username) ?? getTrimmedString(source.name);
      if (username) {
        return {
          username,
          sessionId: extractSessionId(result),
          provider: result.provider as AiohaProvider | undefined,
        };
      }
    }
  }

  return null;
}

/**
 * Extract username from Aioha instance state
 */
export function extractFromAiohaInstance(aioha: AiohaInstance): ExtractedAiohaUser | null {
  // Try user object
  if (aioha.user?.username) {
    return {
      username: aioha.user.username,
      sessionId: extractSessionId(aioha.user),
      provider: aioha.currentProvider,
    };
  }

  // Try currentUser
  if (aioha.currentUser?.username) {
    return {
      username: aioha.currentUser.username,
      sessionId: extractSessionId(aioha.currentUser),
      provider: aioha.currentProvider,
    };
  }

  // Try direct username
  if (aioha.username) {
    return {
      username: aioha.username,
      sessionId: extractSessionId(aioha),
      provider: aioha.currentProvider,
    };
  }

  // Try account
  if (aioha.account?.name) {
    return {
      username: aioha.account.name,
      sessionId: extractSessionId(aioha),
      provider: aioha.currentProvider,
    };
  }

  // Try state objects
  const stateUser = aioha.state?.user ?? aioha._state?.user;
  if (stateUser?.username) {
    return {
      username: stateUser.username,
      sessionId: extractSessionId(stateUser),
      provider: aioha.currentProvider,
    };
  }

  return null;
}

/**
 * Normalize raw Aioha result to typed result
 */
export function normalizeAiohaResult(raw: AiohaRawLoginResult): AiohaLoginResult {
  // Check for cancellation
  if (raw.cancelled) {
    return {
      success: false,
      cancelled: true,
      provider: raw.provider as AiohaProvider | undefined,
    };
  }

  // Check for explicit error
  if (raw.error || raw.errorCode) {
    return {
      success: false,
      error: raw.error || `Error code: ${raw.errorCode}`,
      errorCode: raw.errorCode,
      provider: raw.provider as AiohaProvider | undefined,
    };
  }

  // Try to extract user data
  const extracted = extractFromRawLoginResult(raw);
  if (extracted) {
    return {
      success: true,
      username: extracted.username,
      provider: extracted.provider || 'keychain',
      sessionId: extracted.sessionId,
    };
  }

  // No user data found - treat as failure
  return {
    success: false,
    error: 'Unable to extract username from login result',
  };
}
