import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletProvider';
import { isKeychainAvailable } from '@/lib/wallet/detect';
import { logger } from '@/lib/logger';
import type { ChallengeData } from '@/contexts/auth/auth-persistence';

export interface UseKeychainLoginResult {
  hiveUsername: string;
  setHiveUsername: (username: string) => void;
  isConnecting: boolean;
  errorMessage: string | null;
  isKeychainAvailable: boolean;
  isWalletReady: boolean;
  performKeychainLogin: () => Promise<void>;
  dismissError: () => void;
  resetState: () => void;
}

export const useKeychainLogin = (onSuccess?: () => void): UseKeychainLoginResult => {
  const router = useRouter();
  const { loginWithWallet } = useAuth();
  const wallet = useWallet();

  const [hiveUsername, setHiveUsername] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const keychainAvailable = useMemo(() => isKeychainAvailable(), []);
  const isWalletReady = wallet.isReady;

  const dismissError = useCallback(() => setErrorMessage(null), []);

  const resetState = useCallback(() => {
    setHiveUsername('');
    setIsConnecting(false);
    setErrorMessage(null);
  }, []);

  const performKeychainLogin = useCallback(async () => {
    if (!hiveUsername.trim()) {
      setErrorMessage('Please enter your Hive username');
      return;
    }

    if (!wallet.isReady) {
      setErrorMessage('Wallet is not available. Please refresh the page and try again.');
      return;
    }

    if (!isKeychainAvailable()) {
      setErrorMessage(
        'Hive Keychain extension not detected. Please install the Hive Keychain browser extension and refresh the page.'
      );
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const username = hiveUsername.trim();

      // Fetch server challenge BEFORE the Keychain popup so we can sign
      // both the login proof and the challenge in a single popup
      const challengeRes = await fetch(
        `/api/auth/hive-challenge?username=${encodeURIComponent(username)}`
      );
      if (!challengeRes.ok) {
        throw new Error('Failed to fetch authentication challenge');
      }
      const { challenge, mac } = await challengeRes.json();

      // Single Keychain popup: signs the challenge (proves key ownership + creates session proof)
      const result = await wallet.login('keychain', username, challenge);

      if (result.success) {
        // Bundle challenge data from the login signature
        let challengeData: ChallengeData | undefined;
        if (result.signature) {
          challengeData = {
            challenge,
            challengeMac: mac,
            signature: result.signature,
          };
        }

        await loginWithWallet(result, challengeData);
        resetState();
        onSuccess?.();
        router.push('/sportsbites');
      } else {
        if (result.cancelled) {
          setErrorMessage('Login cancelled');
        } else {
          throw new Error(result.error || 'Invalid authentication result. Please try again.');
        }
      }
    } catch (error) {
      logger.error('Keychain login failed', 'useKeychainLogin', error);
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.toLowerCase().includes('cancel') || message.toLowerCase().includes('denied')) {
        setErrorMessage('Login cancelled');
      } else {
        setErrorMessage('Login failed: ' + message);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [wallet, hiveUsername, loginWithWallet, onSuccess, resetState, router]);

  return {
    hiveUsername,
    setHiveUsername,
    isConnecting,
    errorMessage,
    isKeychainAvailable: keychainAvailable,
    isWalletReady,
    performKeychainLogin,
    dismissError,
    resetState,
  };
};
