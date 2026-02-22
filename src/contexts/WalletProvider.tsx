'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  WalletProvider as WalletProviderType,
  WalletLoginOutcome,
  WalletSignOutcome,
  WalletContextValue,
} from '@/lib/wallet/types';
import type { BroadcastResult } from '@/lib/hive/broadcast-client';
import type { HiveOperation, KeyType } from '@/types/hive-operations';
import { getAvailableProviders } from '@/lib/wallet/detect';
import { loadWalletSession, saveWalletSession, clearWalletSession } from '@/lib/wallet/storage';
import { keychainLogin, keychainSignMessage, keychainBroadcast } from '@/lib/wallet/keychain';
import {
  hivesignerLogin,
  hivesignerBroadcast,
  clearHivesignerSession,
} from '@/lib/wallet/hivesigner';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<WalletProviderType | null>(null);
  const [availableProviders, setAvailableProviders] = useState<WalletProviderType[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs mirror state synchronously so callbacks never read stale values.
  // Without these, signMessage/signAndBroadcast called immediately after login
  // would see the OLD currentProvider (null) because React state updates are async.
  const providerRef = useRef<WalletProviderType | null>(null);
  const userRef = useRef<string | null>(null);

  // Detect providers and restore session on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      setAvailableProviders(getAvailableProviders());

      const session = loadWalletSession();
      if (session) {
        setCurrentUser(session.username);
        setCurrentProvider(session.provider);
        userRef.current = session.username;
        providerRef.current = session.provider;
      }

      setIsReady(true);
    } catch (err) {
      logger.error('Failed to initialize wallet', 'WalletProvider', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize wallet');
      setIsReady(true); // still ready, just errored
    }
  }, []);

  // Re-detect keychain availability after a short delay
  // (extension may inject after initial page load)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      setAvailableProviders(getAvailableProviders());
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const login = useCallback(
    async (provider: WalletProviderType, username: string): Promise<WalletLoginOutcome> => {
      setError(null);

      let result: WalletLoginOutcome;

      if (provider === 'keychain') {
        result = await keychainLogin(username, 'Login to Sportsblock');
      } else {
        result = await hivesignerLogin();
      }

      if (result.success) {
        // Update refs synchronously BEFORE state so that callbacks
        // (signMessage, signAndBroadcast) called in the same tick read fresh values.
        userRef.current = result.username;
        providerRef.current = result.provider;
        setCurrentUser(result.username);
        setCurrentProvider(result.provider);
        saveWalletSession(result.provider, result.username);
        // Refresh available providers (in case keychain appeared)
        setAvailableProviders(getAvailableProviders());
      }

      return result;
    },
    []
  );

  const logout = useCallback(async () => {
    userRef.current = null;
    providerRef.current = null;
    setCurrentUser(null);
    setCurrentProvider(null);
    setError(null);
    clearWalletSession();
    clearHivesignerSession();
  }, []);

  const signMessage = useCallback(
    async (username: string, message: string): Promise<WalletSignOutcome> => {
      // Read from ref (not state) to avoid stale closure after login.
      if (providerRef.current === 'keychain') {
        return keychainSignMessage(username, message);
      }

      // HiveSigner doesn't support client-side message signing.
      // The caller should handle this case by using the OAuth token instead.
      return {
        success: false,
        error: 'HiveSigner does not support message signing',
      };
    },
    [] // No state dependency needed — reads from ref
  );

  const signAndBroadcast = useCallback(
    async (operations: HiveOperation[], keyType: KeyType): Promise<BroadcastResult> => {
      // Read from refs (not state) to avoid stale closure after login.
      const user = userRef.current;
      const provider = providerRef.current;

      if (!user || !provider) {
        return { success: false, error: 'No wallet connected' };
      }

      if (provider === 'keychain') {
        return keychainBroadcast(user, operations, keyType);
      }

      return hivesignerBroadcast(operations);
    },
    [] // No state dependency needed — reads from refs
  );

  // -------------------------------------------------------------------------
  // Value
  // -------------------------------------------------------------------------

  const value: WalletContextValue = useMemo(
    () => ({
      currentUser,
      currentProvider,
      availableProviders,
      isReady,
      error,
      login,
      logout,
      signMessage,
      signAndBroadcast,
    }),
    [
      currentUser,
      currentProvider,
      availableProviders,
      isReady,
      error,
      login,
      logout,
      signMessage,
      signAndBroadcast,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
