/**
 * Wallet session persistence via localStorage.
 */

import type { WalletProvider } from './types';

const KEYS = {
  provider: 'sportsblock:walletProvider',
  username: 'sportsblock:walletUsername',
  loginAt: 'sportsblock:walletLoginAt',
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
    const provider = localStorage.getItem(KEYS.provider) as WalletProvider | null;
    const username = localStorage.getItem(KEYS.username);

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
  } catch {
    // localStorage unavailable
  }
}
