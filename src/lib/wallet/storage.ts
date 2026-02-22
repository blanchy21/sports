/**
 * Wallet session persistence via localStorage.
 */

import type { WalletProvider } from './types';

const KEYS = {
  provider: 'sportsblock:walletProvider',
  username: 'sportsblock:walletUsername',
  loginAt: 'sportsblock:walletLoginAt',
} as const;

// Legacy Aioha keys for one-time migration
const LEGACY_KEYS = {
  username: 'aiohaUsername',
  provider: 'aiohaProvider',
  loginAt: 'aiohaLastLoginAt',
} as const;

export interface WalletSession {
  provider: WalletProvider;
  username: string;
}

export function saveWalletSession(provider: WalletProvider, username: string): void {
  try {
    localStorage.setItem(KEYS.provider, provider);
    localStorage.setItem(KEYS.username, username);
    localStorage.setItem(KEYS.loginAt, new Date().toISOString());
  } catch {
    // localStorage unavailable
  }
}

export function loadWalletSession(): WalletSession | null {
  try {
    let provider = localStorage.getItem(KEYS.provider) as WalletProvider | null;
    let username = localStorage.getItem(KEYS.username);

    // One-time migration from Aioha keys
    if (!provider || !username) {
      const legacyProvider = localStorage.getItem(LEGACY_KEYS.provider);
      const legacyUsername = localStorage.getItem(LEGACY_KEYS.username);

      if (legacyProvider && legacyUsername) {
        const normalized =
          legacyProvider === 'keychain' || legacyProvider === 'hivesigner'
            ? (legacyProvider as WalletProvider)
            : null;

        if (normalized) {
          provider = normalized;
          username = legacyUsername;
          // Persist in new format and clean up legacy keys
          saveWalletSession(provider, username);
          localStorage.removeItem(LEGACY_KEYS.provider);
          localStorage.removeItem(LEGACY_KEYS.username);
          localStorage.removeItem(LEGACY_KEYS.loginAt);
        }
      }
    }

    if (provider && username && (provider === 'keychain' || provider === 'hivesigner')) {
      return { provider, username };
    }

    return null;
  } catch {
    return null;
  }
}

export function clearWalletSession(): void {
  try {
    localStorage.removeItem(KEYS.provider);
    localStorage.removeItem(KEYS.username);
    localStorage.removeItem(KEYS.loginAt);
    // Also clean any remaining legacy keys
    localStorage.removeItem(LEGACY_KEYS.provider);
    localStorage.removeItem(LEGACY_KEYS.username);
    localStorage.removeItem(LEGACY_KEYS.loginAt);
  } catch {
    // localStorage unavailable
  }
}
