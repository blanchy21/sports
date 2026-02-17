import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Providers, KeyTypes } from '@aioha/aioha';
import { useAuth } from '@/contexts/AuthContext';
import { useAioha } from '@/contexts/AiohaProvider';
import type { HiveAccount } from '@/lib/shared/types';
import { logger } from '@/lib/logger';

// Declare Hive Keychain global for browser extension detection
declare global {
  interface Window {
    hive_keychain?: {
      requestSignBuffer?: (
        username: string,
        message: string,
        keyType: string,
        callback: (response: unknown) => void
      ) => void;
      [key: string]: unknown;
    };
  }
}

// Login timeout in milliseconds (10 seconds)
const LOGIN_TIMEOUT_MS = 10000;

/**
 * Check if Hive Keychain browser extension is installed and available
 */
function isKeychainExtensionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.hive_keychain && typeof window.hive_keychain === 'object');
}

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
  ]);
}

interface AiohaLoginResult {
  user?: {
    username?: string;
    account?: HiveAccount;
    session?: string;
  };
  username?: string;
  account?: HiveAccount;
  session?: string;
  provider?: string;
  aiohaUserId?: string;
  sessionId?: string;
  errorCode?: number;
  success?: boolean;
  [key: string]: unknown;
}

export interface UseKeychainLoginResult {
  hiveUsername: string;
  setHiveUsername: (username: string) => void;
  isConnecting: boolean;
  errorMessage: string | null;
  isKeychainAvailable: boolean;
  isAiohaReady: boolean;
  performKeychainLogin: () => Promise<void>;
  dismissError: () => void;
  resetState: () => void;
}

export const useKeychainLogin = (onSuccess?: () => void): UseKeychainLoginResult => {
  const router = useRouter();
  const { loginWithAioha } = useAuth();
  const { aioha, isInitialized } = useAioha();

  const [hiveUsername, setHiveUsername] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isKeychainAvailable = useMemo(() => isKeychainExtensionAvailable(), []);
  const isAiohaReady = useMemo(() => Boolean(aioha) && isInitialized, [aioha, isInitialized]);

  const dismissError = useCallback(() => setErrorMessage(null), []);

  const resetState = useCallback(() => {
    setHiveUsername('');
    setIsConnecting(false);
    setErrorMessage(null);
  }, []);

  const performKeychainLogin = useCallback(async () => {
    // Validate username
    if (!hiveUsername.trim()) {
      setErrorMessage('Please enter your Hive username');
      return;
    }

    // Check Aioha readiness
    if (!isInitialized || !aioha) {
      setErrorMessage('Authentication is not available. Please refresh the page and try again.');
      return;
    }

    // Check Keychain extension
    if (!isKeychainExtensionAvailable()) {
      setErrorMessage(
        'Hive Keychain extension not detected. Please install the Hive Keychain browser extension and refresh the page.'
      );
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const available = (aioha as { getProviders: () => unknown[] }).getProviders();

      if (!available.includes(Providers.Keychain)) {
        throw new Error(
          'Keychain provider is not available. Please ensure the extension is installed and try again.'
        );
      }

      // Force logout any existing Aioha session to ensure fresh Keychain authorization
      try {
        const aiohaWithLogout = aioha as { logout?: () => Promise<void> };
        if (typeof aiohaWithLogout.logout === 'function') {
          await aiohaWithLogout.logout();
        }
      } catch (logoutError) {
        // Ignore logout errors - we're just clearing any stale session
        console.debug('Aioha logout (pre-login cleanup):', logoutError);
      }

      // Wrap login with timeout to handle unresponsive wallet extensions
      const loginPromise = (
        aioha as {
          login: (
            provider: Providers,
            username: string,
            options: { msg: string; keyType: KeyTypes }
          ) => Promise<unknown>;
        }
      ).login(Providers.Keychain, hiveUsername.trim(), {
        msg: 'Login to Sportsblock',
        keyType: KeyTypes.Posting,
      });

      const result = await withTimeout(
        loginPromise,
        LOGIN_TIMEOUT_MS,
        'Hive Keychain did not respond. Please check if the extension is working and try again.'
      );

      const loginResult: AiohaLoginResult = {
        ...(result as Record<string, unknown>),
        success: (result as { success?: boolean })?.success !== false,
      };

      if (
        result &&
        ((result as { username?: string }).username ||
          (result as { user?: unknown }).user ||
          (result as { account?: unknown }).account) &&
        (loginResult.success ?? true)
      ) {
        await loginWithAioha(loginResult);
        resetState();
        onSuccess?.();
        router.push('/sportsbites');
      } else {
        const info = {
          username: (result as { username?: string })?.username,
          success: (result as { success?: boolean })?.success,
          errorCode: (result as { errorCode?: number })?.errorCode,
        };
        console.debug('Keychain login result validation failed:', info);
        throw new Error(
          (result as { error?: string })?.error ||
            'Invalid authentication result. Please try again.'
        );
      }
    } catch (error) {
      logger.error('Keychain login failed', 'useKeychainLogin', error);
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Handle user cancellation
      if (message.toLowerCase().includes('cancel') || message.toLowerCase().includes('denied')) {
        setErrorMessage('Login cancelled');
      } else {
        setErrorMessage('Login failed: ' + message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [aioha, hiveUsername, isInitialized, loginWithAioha, onSuccess, resetState, router]);

  return {
    hiveUsername,
    setHiveUsername,
    isConnecting,
    errorMessage,
    isKeychainAvailable,
    isAiohaReady,
    performKeychainLogin,
    dismissError,
    resetState,
  };
};
