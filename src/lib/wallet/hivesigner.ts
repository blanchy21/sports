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
const HIVESIGNER_SCOPES = ['login', 'vote', 'comment', 'post'];

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
    return localStorage.getItem(LS_TOKEN);
  } catch {
    return null;
  }
}

export function getHivesignerUsername(): string | null {
  try {
    return localStorage.getItem(LS_USERNAME);
  } catch {
    return null;
  }
}

export function isHivesignerTokenValid(): boolean {
  try {
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
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EXPIRY);
    localStorage.removeItem(LS_USERNAME);
    localStorage.removeItem('hivesignerState');
    localStorage.removeItem('hivesignerTokenType');
  } catch {
    // localStorage unavailable
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
// Broadcast — POST to HiveSigner API with OAuth token
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
    const response = await fetch('https://hivesigner.com/api/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'HiveSigner broadcast failed',
    };
  }
}
