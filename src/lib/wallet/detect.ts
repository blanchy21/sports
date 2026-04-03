/**
 * Wallet provider detection.
 */

import type { WalletProvider } from './types';

/**
 * Check if Hive Keychain browser extension is installed.
 */
export function isKeychainAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.hive_keychain && typeof window.hive_keychain === 'object');
}

/**
 * Get the list of wallet providers to display on the auth page.
 * Both are always shown — Keychain availability is checked at login time,
 * not at render time, so users know the option exists even without the extension.
 */
export function getAvailableProviders(): WalletProvider[] {
  return ['keychain', 'hivesigner'];
}
