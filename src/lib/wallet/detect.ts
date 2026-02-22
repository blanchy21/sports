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
 * Get the list of available wallet providers.
 * HiveSigner is always available (web-based OAuth).
 * Keychain requires the browser extension.
 */
export function getAvailableProviders(): WalletProvider[] {
  const providers: WalletProvider[] = [];
  if (isKeychainAvailable()) {
    providers.push('keychain');
  }
  providers.push('hivesigner');
  return providers;
}
