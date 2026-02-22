/**
 * Hive Keychain browser extension integration.
 *
 * Wraps the callback-based window.hive_keychain API into Promises.
 */

import type { KeychainResponse, WalletLoginOutcome, WalletSignOutcome } from './types';
import type { BroadcastResult } from '@/lib/hive/broadcast-client';
import type { HiveOperation, KeyType } from '@/types/hive-operations';

const LOGIN_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function getKeychain() {
  if (typeof window === 'undefined' || !window.hive_keychain) {
    return null;
  }
  return window.hive_keychain;
}

// ---------------------------------------------------------------------------
// Login — sign a message to prove key ownership
// ---------------------------------------------------------------------------

export function keychainLogin(username: string, message: string): Promise<WalletLoginOutcome> {
  const keychain = getKeychain();
  if (!keychain?.requestSignBuffer) {
    return Promise.resolve({
      success: false,
      error: 'Hive Keychain extension not detected. Please install it and refresh.',
    });
  }

  const raw = new Promise<WalletLoginOutcome>((resolve) => {
    keychain.requestSignBuffer!(username, message, 'Posting', (response: KeychainResponse) => {
      if (response.success) {
        resolve({ success: true, username, provider: 'keychain' });
      } else {
        const msg = response.error || response.message || 'Keychain login failed';
        const cancelled =
          typeof msg === 'string' &&
          (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('denied'));
        resolve({ success: false, error: msg, cancelled });
      }
    });
  });

  return withTimeout(
    raw,
    LOGIN_TIMEOUT_MS,
    'Hive Keychain did not respond. Please check the extension is working and try again.'
  );
}

// ---------------------------------------------------------------------------
// Sign message — used for challenge-response auth
// ---------------------------------------------------------------------------

export function keychainSignMessage(username: string, message: string): Promise<WalletSignOutcome> {
  const keychain = getKeychain();
  if (!keychain?.requestSignBuffer) {
    return Promise.resolve({
      success: false,
      error: 'Hive Keychain extension not available',
    });
  }

  const raw = new Promise<WalletSignOutcome>((resolve) => {
    keychain.requestSignBuffer!(username, message, 'Posting', (response: KeychainResponse) => {
      if (response.success && response.result) {
        resolve({ success: true, signature: response.result });
      } else {
        resolve({
          success: false,
          error: response.error || response.message || 'Failed to sign message',
        });
      }
    });
  });

  return withTimeout(raw, LOGIN_TIMEOUT_MS, 'Hive Keychain did not respond while signing message.');
}

// ---------------------------------------------------------------------------
// Broadcast — sign and broadcast a transaction
// ---------------------------------------------------------------------------

export function keychainBroadcast(
  username: string,
  operations: HiveOperation[],
  keyType: KeyType
): Promise<BroadcastResult> {
  const keychain = getKeychain();
  if (!keychain?.requestBroadcast) {
    return Promise.resolve({
      success: false,
      error: 'Hive Keychain extension not available',
    });
  }

  const keychainKeyType = keyType === 'active' ? 'Active' : 'Posting';

  const raw = new Promise<BroadcastResult>((resolve) => {
    keychain.requestBroadcast!(
      username,
      operations,
      keychainKeyType,
      (response: KeychainResponse) => {
        if (response.success) {
          const txId = response.result || response.data?.id || 'unknown';
          resolve({ success: true, transactionId: String(txId) });
        } else {
          resolve({
            success: false,
            error: response.error || response.message || 'Broadcast failed',
          });
        }
      }
    );
  });

  return withTimeout(raw, 30_000, 'Hive Keychain did not respond to broadcast request.');
}
