/**
 * HiveSigner OAuth integration.
 *
 * HiveSigner uses a popup-based OAuth flow:
 *   1. Open popup to hivesigner.com/oauth2/authorize
 *   2. User approves in the popup
 *   3. Popup redirects to /hivesigner.html which stores token and sends postMessage
 *   4. We resolve the login Promise when we receive the postMessage
 *
 * Token is stored in localStorage (persists across tabs and browser sessions).
 * The httpOnly session cookie is the real auth — this token is only used for
 * client-side HiveSigner API calls (posting-key broadcasts).
 */

import type { WalletLoginOutcome } from './types';
import type { BroadcastResult } from '@/lib/hive/broadcast-client';
import type { HiveOperation } from '@/types/hive-operations';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HIVESIGNER_APP = 'sportsblock';
const HIVESIGNER_SCOPES = ['vote', 'comment', 'custom_json'];

function getCallbackURL(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/hivesigner.html`;
}

function getOAuthURL(): string {
  const params = new URLSearchParams({
    client_id: HIVESIGNER_APP,
    redirect_uri: getCallbackURL(),
    response_type: 'token',
    scope: HIVESIGNER_SCOPES.join(','),
  });
  return `https://hivesigner.com/oauth2/authorize?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Token management (localStorage — persists across tabs & browser sessions)
// ---------------------------------------------------------------------------

const LS_TOKEN = 'hs_token';
const LS_EXPIRY = 'hs_expiry';
const LS_USERNAME = 'hs_username';

// Legacy sessionStorage keys (for migration)
const LEGACY_TOKEN = 'hivesignerToken';
const LEGACY_EXPIRY = 'hivesignerExpiry';
const LEGACY_USERNAME = 'hivesignerUsername';

/**
 * Migrate token from legacy sessionStorage to localStorage (one-time).
 * Existing users who logged in before this change will have their token
 * in sessionStorage — this transparently moves it to localStorage.
 */
function migrateLegacyToken(): void {
  try {
    if (localStorage.getItem(LS_TOKEN)) return; // already migrated

    const legacyToken = sessionStorage.getItem(LEGACY_TOKEN);
    if (!legacyToken) return;

    const username = sessionStorage.getItem(LEGACY_USERNAME);
    const expiry = sessionStorage.getItem(LEGACY_EXPIRY);

    localStorage.setItem(LS_TOKEN, legacyToken);
    if (username) localStorage.setItem(LS_USERNAME, username);
    if (expiry) localStorage.setItem(LS_EXPIRY, expiry);

    // Clean up legacy
    sessionStorage.removeItem(LEGACY_TOKEN);
    sessionStorage.removeItem(LEGACY_EXPIRY);
    sessionStorage.removeItem(LEGACY_USERNAME);
    sessionStorage.removeItem('hivesignerState');
    sessionStorage.removeItem('hivesignerTokenType');
  } catch {
    // Storage unavailable
  }
}

/** Store HiveSigner token and metadata in localStorage. */
export function storeHivesignerToken(
  token: string,
  username: string,
  expiryTimestamp?: number | null
): void {
  try {
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_USERNAME, username);
    if (expiryTimestamp) {
      localStorage.setItem(LS_EXPIRY, String(expiryTimestamp));
    }
  } catch {
    // localStorage unavailable
  }
}

export function getHivesignerToken(): string | null {
  try {
    migrateLegacyToken();
    return localStorage.getItem(LS_TOKEN);
  } catch {
    return null;
  }
}

export function getHivesignerUsername(): string | null {
  try {
    migrateLegacyToken();
    return localStorage.getItem(LS_USERNAME);
  } catch {
    return null;
  }
}

export function isHivesignerTokenValid(): boolean {
  try {
    migrateLegacyToken();
    const token = localStorage.getItem(LS_TOKEN);
    if (!token) return false;

    const expiry = localStorage.getItem(LS_EXPIRY);
    if (!expiry) return true; // no expiry set, assume valid

    return Date.now() < Number(expiry);
  } catch {
    return false;
  }
}

export function clearHivesignerSession(): void {
  try {
    // Clear current localStorage keys
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EXPIRY);
    localStorage.removeItem(LS_USERNAME);
    // Clear legacy sessionStorage keys
    sessionStorage.removeItem(LEGACY_TOKEN);
    sessionStorage.removeItem(LEGACY_EXPIRY);
    sessionStorage.removeItem(LEGACY_USERNAME);
    sessionStorage.removeItem('hivesignerState');
    sessionStorage.removeItem('hivesignerTokenType');
  } catch {
    // Storage unavailable
  }
}

// ---------------------------------------------------------------------------
// Shared popup helper — used by both login and re-auth flows
// ---------------------------------------------------------------------------

interface PopupResult {
  success: boolean;
  username?: string;
  accessToken?: string;
  expiryTimestamp?: number;
  error?: string;
  cancelled?: boolean;
}

function openHivesignerPopup(): Promise<PopupResult> {
  return new Promise((resolve) => {
    const url = getOAuthURL();

    // Open centered popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      url,
      'hivesigner-login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      resolve({
        success: false,
        error: 'Could not open HiveSigner popup. Please allow popups for this site.',
      });
      return;
    }

    let resolved = false;

    // Listen for postMessage from hivesigner.html
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'hivesigner-callback') return;

      cleanup();

      if (data.success && data.username) {
        // Store the token in localStorage so it persists across tabs/sessions
        if (data.accessToken) {
          storeHivesignerToken(data.accessToken, data.username, data.expiryTimestamp);
        }
        resolve({
          success: true,
          username: data.username,
          accessToken: data.accessToken,
          expiryTimestamp: data.expiryTimestamp,
        });
      } else {
        resolve({
          success: false,
          error: data.error || 'HiveSigner authentication failed',
        });
      }
    };

    // Poll for popup close (user closed without completing)
    const pollInterval = setInterval(() => {
      if (popup.closed && !resolved) {
        cleanup();
        // Check if token was saved (popup closed after completing)
        const username = getHivesignerUsername();
        if (username && isHivesignerTokenValid()) {
          resolve({ success: true, username });
        } else {
          resolve({ success: false, error: 'HiveSigner popup was closed', cancelled: true });
        }
      }
    }, 1000);

    function cleanup() {
      if (resolved) return;
      resolved = true;
      clearInterval(pollInterval);
      window.removeEventListener('message', handleMessage);
    }

    window.addEventListener('message', handleMessage);
  });
}

// ---------------------------------------------------------------------------
// Login — open OAuth popup, resolve via postMessage
// ---------------------------------------------------------------------------

export async function hivesignerLogin(): Promise<WalletLoginOutcome> {
  const result = await openHivesignerPopup();

  if (result.success && result.username) {
    return { success: true, username: result.username, provider: 'hivesigner' };
  }

  return {
    success: false,
    error: result.error || 'HiveSigner authentication failed',
    cancelled: result.cancelled,
  };
}

// ---------------------------------------------------------------------------
// Re-auth — silently refresh token when expired/missing, then retry
// ---------------------------------------------------------------------------

async function hivesignerReauth(): Promise<boolean> {
  const result = await openHivesignerPopup();
  return result.success && !!getHivesignerToken();
}

// ---------------------------------------------------------------------------
// Sign via popup — for active-key operations (e.g. Hive-Engine transfers)
//
// HiveSigner OAuth tokens only grant posting authority.  Active-key ops must
// be approved interactively on hivesigner.com via a deep-link URL.
// ---------------------------------------------------------------------------

function buildSignURL(operation: HiveOperation): string {
  const [opType, opBody] = operation;
  const params = new URLSearchParams();

  if (opType === 'custom_json') {
    const body = opBody as Record<string, unknown>;
    if (body.required_auths) params.set('required_auths', JSON.stringify(body.required_auths));
    if (body.required_posting_auths)
      params.set('required_posting_auths', JSON.stringify(body.required_posting_auths));
    if (body.id) params.set('id', String(body.id));
    if (body.json) params.set('json', String(body.json));

    // HiveSigner needs explicit authority hint to sign with the correct key.
    // Without this, it defaults to posting key — causing "Missing Active Authority".
    const requiredAuths = body.required_auths as string[] | undefined;
    if (requiredAuths && requiredAuths.length > 0) {
      params.set('authority', 'active');
    }
  }

  // Use hive-uri template syntax so HiveSigner injects the tx hash into the
  // redirect URL.  The callback page reads `id` from the query string.
  const callbackURL = `${window.location.origin}/hivesigner-sign.html?id={{id}}&block={{block}}`;
  params.set('redirect_uri', callbackURL);

  return `https://hivesigner.com/sign/${opType}?${params.toString()}`;
}

export function hivesignerSignPopup(operations: HiveOperation[]): Promise<BroadcastResult> {
  return new Promise((resolve) => {
    if (operations.length === 0) {
      resolve({ success: false, error: 'No operations to sign' });
      return;
    }

    // HiveSigner sign URL supports a single operation at a time
    const url = buildSignURL(operations[0]);

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      url,
      'hivesigner-sign',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      resolve({
        success: false,
        error: 'Could not open HiveSigner popup. Please allow popups for this site.',
      });
      return;
    }

    let resolved = false;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'hivesigner-sign-callback') return;

      cleanup();

      if (data.success && data.transactionId) {
        resolve({ success: true, transactionId: data.transactionId });
      } else {
        resolve({
          success: false,
          error: data.error || 'HiveSigner signing was cancelled or failed',
        });
      }
    };

    const pollInterval = setInterval(() => {
      if (popup.closed && !resolved) {
        cleanup();
        resolve({ success: false, error: 'HiveSigner signing popup was closed' });
      }
    }, 1000);

    function cleanup() {
      if (resolved) return;
      resolved = true;
      clearInterval(pollInterval);
      window.removeEventListener('message', handleMessage);
    }

    window.addEventListener('message', handleMessage);
  });
}

// ---------------------------------------------------------------------------
// Broadcast — POST to HiveSigner API with OAuth token (posting-key ops only)
//
// If the token is missing or expired, automatically triggers re-auth via
// the OAuth popup and retries the broadcast once.
// ---------------------------------------------------------------------------

async function executeBroadcast(
  token: string,
  operations: HiveOperation[]
): Promise<BroadcastResult> {
  const response = await fetch('https://hivesigner.com/api/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // HiveSigner SDK sends the raw token without Bearer prefix.
      // See: https://github.com/ecency/hivesigner-sdk
      Authorization: token,
    },
    body: JSON.stringify({ operations }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      error: `HiveSigner broadcast failed (${response.status}): ${body}`,
    };
  }

  const result = await response.json();

  if (result.error) {
    return { success: false, error: result.error_description || result.error };
  }

  const txId = result.result?.id || result.id || 'unknown';
  return { success: true, transactionId: String(txId) };
}

export async function hivesignerBroadcast(operations: HiveOperation[]): Promise<BroadcastResult> {
  let token = getHivesignerToken();
  const expiry = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_EXPIRY) : null;

  if (process.env.NODE_ENV === 'development') {
    console.log(
      '[HiveSigner broadcast] token present:',
      !!token,
      '| valid:',
      isHivesignerTokenValid(),
      '| expires:',
      expiry ? new Date(Number(expiry)).toISOString() : 'unknown',
      '| ops:',
      operations.map(([t]) => t).join(',')
    );
  }

  // If token is missing or expired, attempt automatic re-auth
  if (!token || !isHivesignerTokenValid()) {
    console.log('[HiveSigner] Token missing/expired — triggering re-auth popup');
    const reauthOk = await hivesignerReauth();
    if (!reauthOk) {
      return {
        success: false,
        error: 'HiveSigner session expired. Please log in again.',
      };
    }
    token = getHivesignerToken();
    if (!token) {
      return { success: false, error: 'Failed to refresh HiveSigner token.' };
    }
  }

  try {
    return await executeBroadcast(token, operations);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'HiveSigner broadcast failed',
    };
  }
}
