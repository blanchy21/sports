/**
 * HiveSigner OAuth integration.
 *
 * HiveSigner uses a popup-based OAuth flow:
 *   1. Open popup to hivesigner.com/oauth2/authorize
 *   2. User approves in the popup
 *   3. Popup redirects to /hivesigner.html which stores token and sends postMessage
 *   4. We resolve the login Promise when we receive the postMessage
 */

import type { WalletLoginOutcome } from './types';
import type { BroadcastResult } from '@/lib/hive/broadcast-client';
import type { HiveOperation } from '@/types/hive-operations';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HIVESIGNER_APP = 'sportsblock';
const HIVESIGNER_SCOPES = ['login', 'vote', 'comment', 'post', 'custom_json'];

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
// Token management
// ---------------------------------------------------------------------------

const LS_TOKEN = 'hivesignerToken';
const LS_EXPIRY = 'hivesignerExpiry';
const LS_USERNAME = 'hivesignerUsername';

export function getHivesignerToken(): string | null {
  try {
    return sessionStorage.getItem(LS_TOKEN);
  } catch {
    return null;
  }
}

export function getHivesignerUsername(): string | null {
  try {
    return sessionStorage.getItem(LS_USERNAME);
  } catch {
    return null;
  }
}

export function isHivesignerTokenValid(): boolean {
  try {
    const token = sessionStorage.getItem(LS_TOKEN);
    if (!token) return false;

    const expiry = sessionStorage.getItem(LS_EXPIRY);
    if (!expiry) return true; // no expiry set, assume valid

    return Date.now() < Number(expiry);
  } catch {
    return false;
  }
}

export function clearHivesignerSession(): void {
  try {
    sessionStorage.removeItem(LS_TOKEN);
    sessionStorage.removeItem(LS_EXPIRY);
    sessionStorage.removeItem(LS_USERNAME);
    sessionStorage.removeItem('hivesignerState');
    sessionStorage.removeItem('hivesignerTokenType');
  } catch {
    // sessionStorage unavailable
  }
}

// ---------------------------------------------------------------------------
// Login — open OAuth popup, resolve via postMessage
// ---------------------------------------------------------------------------

export function hivesignerLogin(): Promise<WalletLoginOutcome> {
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
        // Store the OAuth token in the opener's sessionStorage so that
        // loginWithWallet → getHivesignerToken() can find it for server verification.
        // The popup's sessionStorage is isolated and inaccessible from the opener.
        if (data.accessToken) {
          try {
            sessionStorage.setItem(LS_TOKEN, data.accessToken);
            sessionStorage.setItem(LS_USERNAME, data.username);
            if (data.expiryTimestamp) {
              sessionStorage.setItem(LS_EXPIRY, String(data.expiryTimestamp));
            }
          } catch {
            // sessionStorage unavailable
          }
        }
        resolve({ success: true, username: data.username, provider: 'hivesigner' });
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
          resolve({ success: true, username, provider: 'hivesigner' });
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
  }

  const callbackURL = `${window.location.origin}/hivesigner-sign.html`;
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
// ---------------------------------------------------------------------------

export async function hivesignerBroadcast(operations: HiveOperation[]): Promise<BroadcastResult> {
  const token = getHivesignerToken();
  if (!token) {
    return { success: false, error: 'HiveSigner token not available. Please log in again.' };
  }

  if (!isHivesignerTokenValid()) {
    return { success: false, error: 'HiveSigner token has expired. Please log in again.' };
  }

  try {
    // Use standard Bearer prefix (HiveSigner returns token_type=bearer)
    const authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;

    const response = await fetch('https://hivesigner.com/api/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
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
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'HiveSigner broadcast failed',
    };
  }
}
