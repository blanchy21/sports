import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletProvider';
import { isKeychainAvailable } from '@/lib/wallet/detect';
import type { WalletLoginResult } from '@/lib/wallet/types';
import { logger } from '@/lib/logger';

// localStorage keys for remembering credentials across sessions
const REMEMBERED_HIVE_USERNAME_KEY = 'sportsblock:rememberedHiveUsername';

const usernameRequiredProviders = new Set(['keychain']);

interface UseAuthPageResult {
  isConnecting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  dismissError: () => void;
  availableProviders: string[];
  isWalletReady: boolean;
  showHiveUsernameInput: boolean;
  selectedProvider: string | null;
  hiveUsername: string;
  onHiveUsernameChange: (value: string) => void;
  onHiveUsernameSubmit: () => void;
  onHiveUsernameCancel: () => void;
  onProviderSelect: (provider: string) => void;
  handleGoogleSignIn: () => void;
  resetConnectionState: () => void;
}

export const useAuthPage = (): UseAuthPageResult => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddAccountFlow = searchParams.get('addAccount') === 'true';
  const isFromGoogle = searchParams.get('from') === 'google';
  const { user, isClient, loginWithWallet } = useAuth();
  const wallet = useWallet();

  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showHiveUsernameInput, setShowHiveUsernameInput] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [hiveUsername, setHiveUsername] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(REMEMBERED_HIVE_USERNAME_KEY) ?? '') : ''
  );

  const isWalletReady = wallet.isReady;
  const availableProviders = useMemo(() => wallet.availableProviders, [wallet.availableProviders]);

  const autoReconnectAttempted = useRef(false);

  // Redirect if already authenticated, or auto-reconnect if wallet is still active
  useEffect(() => {
    if (!isClient) return;

    // Already logged in via AuthContext — redirect away from auth page
    if (user?.username && !isAddAccountFlow) {
      if (!user.isHiveAuth && !user.hiveUsername) {
        router.replace('/onboarding/username');
      } else {
        router.replace('/sportsbites');
      }
      return;
    }

    // Session expired but wallet still connected — auto-reconnect (once)
    if (
      isWalletReady &&
      wallet.currentUser &&
      !autoReconnectAttempted.current &&
      !isAddAccountFlow &&
      !isFromGoogle
    ) {
      autoReconnectAttempted.current = true;
      setIsConnecting(true);
      loginWithWallet()
        .then(() => {
          router.replace('/sportsbites');
        })
        .catch((error) => {
          logger.error('Auto-reconnect failed', 'useAuthPage', error);
          setErrorMessage(error instanceof Error ? error.message : 'Auto-reconnect failed');
          setIsConnecting(false);
        });
    }
  }, [
    isClient,
    user,
    isWalletReady,
    wallet.currentUser,
    isAddAccountFlow,
    isFromGoogle,
    loginWithWallet,
    router,
  ]);

  const resetHivePrompt = useCallback(() => {
    setShowHiveUsernameInput(false);
    setSelectedProvider(null);
    setHiveUsername('');
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  // Listen for HiveSigner popup callback via postMessage.
  // The popup (hivesigner.html) sends { source: 'hivesigner-callback', success, username }
  // after the user approves in HiveSigner.
  useEffect(() => {
    const handleHiveSignerMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'hivesigner-callback') return;

      if (data.success && data.username) {
        setIsConnecting(true);
        setErrorMessage(null);
        try {
          const result: WalletLoginResult = {
            success: true,
            username: data.username,
            provider: 'hivesigner',
          };
          await loginWithWallet(result);
          resetHivePrompt();
          router.push('/sportsbites');
        } catch (error) {
          logger.error('HiveSigner postMessage login failed', 'useAuthPage', error);
          setErrorMessage(
            'Login failed: ' + (error instanceof Error ? error.message : 'Unknown error')
          );
        } finally {
          setIsConnecting(false);
        }
      } else if (!data.success) {
        setErrorMessage('HiveSigner authentication failed: ' + (data.error || 'Unknown error'));
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleHiveSignerMessage);
    return () => window.removeEventListener('message', handleHiveSignerMessage);
  }, [loginWithWallet, resetHivePrompt, router]);

  const handleGoogleSignIn = useCallback(() => {
    signIn('google', { callbackUrl: '/auth/google-callback' });
  }, []);

  const resetConnectionState = useCallback(() => {
    setIsConnecting(false);
    setErrorMessage(null);
  }, []);

  const performWalletLogin = useCallback(
    async (provider: string) => {
      if (!wallet.isReady) {
        setErrorMessage('Wallet is not available. Please refresh the page and try again.');
        return;
      }

      if (provider === 'keychain' && !isKeychainAvailable()) {
        setErrorMessage(
          'Hive Keychain extension not detected. Please install the Hive Keychain browser extension and refresh the page.'
        );
        return;
      }

      if (usernameRequiredProviders.has(provider)) {
        if (!hiveUsername.trim()) {
          setSelectedProvider(provider);
          setShowHiveUsernameInput(true);
          setErrorMessage(null);
          return;
        }
      }

      setIsConnecting(true);
      setErrorMessage(null);

      try {
        const usernameToUse =
          usernameRequiredProviders.has(provider) && hiveUsername.trim() ? hiveUsername.trim() : '';

        const result = await wallet.login(provider as 'keychain' | 'hivesigner', usernameToUse);

        if (result.success) {
          await loginWithWallet(result);
          if (usernameToUse) {
            try {
              localStorage.setItem(REMEMBERED_HIVE_USERNAME_KEY, usernameToUse);
            } catch {
              // localStorage may be unavailable
            }
          }
          resetHivePrompt();
          router.push('/sportsbites');
        } else {
          if (result.cancelled) {
            setErrorMessage('Login cancelled');
          } else {
            throw new Error(result.error || 'Invalid authentication result. Please try again.');
          }
        }
      } catch (error) {
        logger.error('Wallet login failed', 'useAuthPage', error);
        setErrorMessage(
          'Login failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [wallet, hiveUsername, loginWithWallet, resetHivePrompt, router]
  );

  const onProviderSelect = useCallback(
    (provider: string) => {
      setSelectedProvider(provider);
      performWalletLogin(provider);
    },
    [performWalletLogin]
  );

  const onHiveUsernameSubmit = useCallback(() => {
    if (!selectedProvider) return;
    performWalletLogin(selectedProvider);
  }, [performWalletLogin, selectedProvider]);

  const onHiveUsernameCancel = useCallback(() => {
    resetConnectionState();
    resetHivePrompt();
  }, [resetConnectionState, resetHivePrompt]);

  return {
    isConnecting,
    errorMessage,
    successMessage,
    dismissError,
    availableProviders,
    isWalletReady,
    showHiveUsernameInput,
    selectedProvider,
    hiveUsername,
    onHiveUsernameChange: setHiveUsername,
    onHiveUsernameSubmit,
    onHiveUsernameCancel,
    onProviderSelect,
    handleGoogleSignIn,
    resetConnectionState,
  };
};
