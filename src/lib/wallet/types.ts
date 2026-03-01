/**
 * Wallet integration types for Hive Keychain and HiveSigner.
 */

import type { HiveOperation, KeyType } from '@/types/hive-operations';
import type { BroadcastResult } from '@/lib/hive/broadcast-client';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type WalletProvider = 'keychain' | 'hivesigner';

// ---------------------------------------------------------------------------
// Login Results
// ---------------------------------------------------------------------------

export interface WalletLoginResult {
  success: true;
  username: string;
  provider: WalletProvider;
  /** Keychain: the hex signature from requestSignBuffer (used for challenge-response auth) */
  signature?: string;
}

export interface WalletLoginFailure {
  success: false;
  error: string;
  cancelled?: boolean;
}

export type WalletLoginOutcome = WalletLoginResult | WalletLoginFailure;

// ---------------------------------------------------------------------------
// Sign Results
// ---------------------------------------------------------------------------

export interface WalletSignResult {
  success: true;
  signature: string;
}

export interface WalletSignFailure {
  success: false;
  error: string;
}

export type WalletSignOutcome = WalletSignResult | WalletSignFailure;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface WalletState {
  currentUser: string | null;
  currentProvider: WalletProvider | null;
  availableProviders: WalletProvider[];
  isReady: boolean;
  error: string | null;
}

export interface WalletActions {
  login: (
    provider: WalletProvider,
    username: string,
    message?: string
  ) => Promise<WalletLoginOutcome>;
  logout: () => Promise<void>;
  signMessage: (username: string, message: string) => Promise<WalletSignOutcome>;
  signAndBroadcast: (operations: HiveOperation[], keyType: KeyType) => Promise<BroadcastResult>;
}

export type WalletContextValue = WalletState & WalletActions;

// ---------------------------------------------------------------------------
// Keychain global type
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    hive_keychain?: {
      requestSignBuffer?: (
        username: string,
        message: string,
        keyType: string,
        callback: (response: KeychainResponse) => void
      ) => void;
      requestBroadcast?: (
        username: string,
        operations: HiveOperation[],
        keyType: string,
        callback: (response: KeychainResponse) => void
      ) => void;
      requestHandshake?: (callback: (response: KeychainResponse) => void) => void;
      [key: string]: unknown;
    };
  }
}

export interface KeychainResponse {
  success: boolean;
  error?: string;
  message?: string;
  result?: string | Record<string, unknown>; // string for sign, object { id: txHash } for broadcast
  publicKey?: string;
  data?: {
    id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
