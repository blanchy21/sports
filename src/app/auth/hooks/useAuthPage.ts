import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Providers, KeyTypes } from '@aioha/aioha';
import type { LoginResult, LoginResultSuccess } from '@aioha/aioha/build/types';
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

// localStorage keys for remembering credentials across sessions
const REMEMBERED_EMAIL_KEY = 'sportsblock:rememberedEmail';
const REMEMBERED_HIVE_USERNAME_KEY = 'sportsblock:rememberedHiveUsername';

/**
 * Map of Providers enum values to their string representations.
 * Used to convert enum values returned by getProviders() to display strings.
 */
const PROVIDER_STRING_MAP: Record<string, string> = {
  [Providers.Keychain]: 'keychain',
  [Providers.HiveSigner]: 'hivesigner',
  [Providers.HiveAuth]: 'hiveauth',
  [Providers.Ledger]: 'ledger',
  [Providers.PeakVault]: 'peakvault',
  [Providers.MetaMaskSnap]: 'metamasksnap',
  [Providers.ViewOnly]: 'viewonly',
  [Providers.Custom]: 'custom',
};

/**
 * Convert a provider value (enum or string) to its normalized string representation.
 * The Providers enum values are themselves strings (e.g., Providers.Keychain === 'keychain'),
 * but this function handles any edge cases.
 */
function normalizeProviderToString(provider: Providers | string): string {
  // First check if it's in our known provider map
  const mapped = PROVIDER_STRING_MAP[provider];
  if (mapped) return mapped;
  // Fallback: if it's already a string not in the map, return as-is
  return String(provider);
}

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

export type AuthMode = 'login' | 'signup';

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

export interface EmailFormState {
  email: string;
  password: string;
  username: string;
  displayName: string;
  acceptTerms: boolean;
  subscribeNewsletter: boolean;
  showPassword: boolean;
}

interface UseAuthPageResult {
  mode: AuthMode;
  toggleMode: () => void;
  isConnecting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  dismissError: () => void;
  availableProviders: string[];
  isAiohaReady: boolean;
  showHiveUsernameInput: boolean;
  selectedProvider: string | null;
  hiveUsername: string;
  onHiveUsernameChange: (value: string) => void;
  onHiveUsernameSubmit: () => void;
  onHiveUsernameCancel: () => void;
  onProviderSelect: (provider: string) => void;
  emailForm: EmailFormState;
  updateEmailField: <K extends keyof EmailFormState>(field: K, value: EmailFormState[K]) => void;
  togglePasswordVisibility: () => void;
  handleEmailSubmit: () => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
  handleForgotPassword: () => Promise<void>;
  showAiohaModal: boolean;
  openAiohaModal: () => void;
  closeAiohaModal: () => void;
  setShowAiohaModal: Dispatch<SetStateAction<boolean>>;
  handleAiohaModalLogin: (result: LoginResult) => Promise<void>;
  resetConnectionState: () => void;
}

const usernameRequiredProviders = new Set(['keychain', 'hiveauth']);

export const useAuthPage = (): UseAuthPageResult => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddAccountFlow = searchParams.get('addAccount') === 'true';
  const { user, isClient, loginWithAioha } = useAuth();
  const { aioha, isInitialized } = useAioha();

  const [mode, setMode] = useState<AuthMode>('login');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  const [showHiveUsernameInput, setShowHiveUsernameInput] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [hiveUsername, setHiveUsername] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(REMEMBERED_HIVE_USERNAME_KEY) ?? '') : ''
  );
  const [showAiohaModal, setShowAiohaModal] = useState(false);

  const [emailForm, setEmailForm] = useState<EmailFormState>(() => ({
    email: typeof window !== 'undefined' ? (localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '') : '',
    password: '',
    username: '',
    displayName: '',
    acceptTerms: false,
    subscribeNewsletter: false,
    showPassword: false,
  }));

  const isAiohaReady = useMemo(() => Boolean(aioha) && isInitialized, [aioha, isInitialized]);

  const autoReconnectAttempted = useRef(false);

  // Redirect if already authenticated, or auto-reconnect if wallet is still active
  useEffect(() => {
    if (!isClient) return;

    // Already logged in via AuthContext - redirect away from auth page
    // Skip redirect when adding a new account to preserve multi-account flow
    if (user?.username && !isAddAccountFlow) {
      router.replace('/sportsbites');
      return;
    }

    // Session expired but wallet still connected - auto-reconnect (once)
    // Skip auto-reconnect when adding a new account
    if (isAiohaReady && aioha && !autoReconnectAttempted.current && !isAddAccountFlow) {
      const aiohaInstance = aioha as { getCurrentUser?: () => string | undefined };
      const walletUser = aiohaInstance.getCurrentUser?.();
      if (walletUser) {
        autoReconnectAttempted.current = true;
        setIsConnecting(true);
        loginWithAioha()
          .then(() => {
            router.replace('/sportsbites');
          })
          .catch(() => {
            // Auto-reconnect failed, let user manually authenticate
            setIsConnecting(false);
          });
      }
    }
  }, [isClient, user, isAiohaReady, aioha, isAddAccountFlow, loginWithAioha, router]);

  const resetHivePrompt = useCallback(() => {
    setShowHiveUsernameInput(false);
    setSelectedProvider(null);
    setHiveUsername('');
  }, []);

  const updateEmailField = useCallback(
    <K extends keyof EmailFormState>(field: K, value: EmailFormState[K]) => {
      setEmailForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const resetEmailForm = useCallback(() => {
    setEmailForm({
      email: '',
      password: '',
      username: '',
      displayName: '',
      acceptTerms: false,
      subscribeNewsletter: false,
      showPassword: false,
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setErrorMessage(null);
    setSuccessMessage(null);
    resetEmailForm();
  }, [resetEmailForm]);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const openAiohaModal = useCallback(() => setShowAiohaModal(true), []);
  const closeAiohaModal = useCallback(() => setShowAiohaModal(false), []);

  useEffect(() => {
    if (!aioha) {
      setAvailableProviders([]);
      return;
    }

    try {
      // getProviders() returns string[] - the Providers enum values are themselves strings
      // (e.g., Providers.Keychain === 'keychain'), so we can use them directly
      const providers = (aioha as { getProviders: () => string[] }).getProviders();
      const providerStrings = providers
        .map((provider: string) => normalizeProviderToString(provider))
        .filter((p) => p !== 'metamasksnap');

      const priorityProviders = ['keychain', 'hivesigner', 'hiveauth'];
      const orderedProviders = [
        ...priorityProviders.filter((provider) => providerStrings.includes(provider)),
        ...providerStrings.filter((provider) => !priorityProviders.includes(provider)),
      ];

      setAvailableProviders(orderedProviders);
    } catch (error) {
      logger.error('Error getting available providers', 'useAuthPage', error);
      setAvailableProviders([]);
    }
  }, [aioha, isInitialized]);

  useEffect(() => {
    if (!aioha) return;

    const handleAuthSuccess = async (event: unknown) => {
      setIsConnecting(true);
      setErrorMessage(null);

      try {
        const loginResult: AiohaLoginResult = {
          ...(event as Record<string, unknown>),
          success: true,
        };

        await loginWithAioha(loginResult);
        resetHivePrompt();
        closeAiohaModal();
        router.push('/sportsbites');
      } catch (error) {
        logger.error('Aioha login failed', 'useAuthPage', error);
        setErrorMessage(
          'Login failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        );
      } finally {
        setIsConnecting(false);
        closeAiohaModal();
      }
    };

    const handleAuthError = (error: unknown) => {
      logger.error('Aioha authentication error', 'useAuthPage', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage('Authentication failed: ' + message);
      setIsConnecting(false);
    };

    const aiohaWithEvents = aioha as {
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      off: (event: string, handler?: (...args: unknown[]) => void) => void;
    };

    aiohaWithEvents.on('connect', handleAuthSuccess);
    aiohaWithEvents.on('error', handleAuthError);

    return () => {
      aiohaWithEvents.off('connect', handleAuthSuccess);
      aiohaWithEvents.off('error', handleAuthError);
    };
  }, [aioha, closeAiohaModal, loginWithAioha, resetHivePrompt, router]);

  const validateEmailForm = useCallback((): string | null => {
    if (!emailForm.email || !emailForm.password) {
      return 'Please enter both email and password';
    }

    if (mode === 'signup') {
      if (!emailForm.username) {
        return 'Please choose a username';
      }
      if (!emailForm.acceptTerms) {
        return 'Please accept the terms of service';
      }
    }

    return null;
  }, [emailForm.acceptTerms, emailForm.email, emailForm.password, emailForm.username, mode]);

  const handleEmailSubmit = useCallback(async () => {
    setErrorMessage('Email authentication is currently unavailable. Please use Hive wallet login.');
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setErrorMessage('Google sign-in is currently unavailable. Please use Hive wallet login.');
  }, []);

  const handleForgotPassword = useCallback(async () => {
    setErrorMessage('Password reset is currently unavailable. Please use Hive wallet login.');
  }, []);

  const resetConnectionState = useCallback(() => {
    setIsConnecting(false);
    setErrorMessage(null);
  }, []);

  const performAiohaLogin = useCallback(
    async (provider: string) => {
      if (!isInitialized || !aioha) {
        setErrorMessage(
          'Aioha authentication is not available. Please refresh the page and try again.'
        );
        return;
      }

      // Check if Keychain extension is actually installed for Keychain provider
      if (provider === 'keychain' && !isKeychainExtensionAvailable()) {
        setErrorMessage(
          'Hive Keychain extension not detected. Please install the Hive Keychain browser extension and refresh the page.'
        );
        return;
      }

      if (provider === 'keychain' || provider === 'hiveauth') {
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
        const available = (aioha as { getProviders: () => unknown[] }).getProviders();

        let providerEnum: Providers;
        switch (provider) {
          case 'keychain':
            providerEnum = Providers.Keychain;
            break;
          case 'hivesigner':
            providerEnum = Providers.HiveSigner;
            break;
          case 'hiveauth':
            providerEnum = Providers.HiveAuth;
            break;
          case 'ledger':
            providerEnum = Providers.Ledger;
            break;
          case 'peakvault':
            providerEnum = Providers.PeakVault;
            break;
          case 'metamasksnap':
            providerEnum = Providers.MetaMaskSnap;
            break;
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }

        if (!available.includes(providerEnum)) {
          throw new Error(
            `${provider} is not available. Please install the required wallet or try a different provider.`
          );
        }

        const usernameToUse =
          usernameRequiredProviders.has(provider) && hiveUsername.trim() ? hiveUsername.trim() : '';

        // Force logout any existing Aioha session to ensure fresh Keychain authorization
        // This is critical for security - the Keychain popup must ALWAYS appear for user approval
        // Skip when adding an account so the current user's persistent login is preserved
        if (!isAddAccountFlow) {
          try {
            const aiohaWithLogout = aioha as { logout?: () => Promise<void> };
            if (typeof aiohaWithLogout.logout === 'function') {
              await aiohaWithLogout.logout();
            }
          } catch (logoutError) {
            // Ignore logout errors - we're just clearing any stale session
            console.debug('Aioha logout (pre-login cleanup):', logoutError);
          }
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
        ).login(providerEnum, usernameToUse, {
          msg: 'Login to Sportsblock',
          keyType: KeyTypes.Posting,
        });

        const result = await withTimeout(
          loginPromise,
          LOGIN_TIMEOUT_MS,
          `${provider === 'keychain' ? 'Hive Keychain' : provider} did not respond. Please check if the extension is working and try again.`
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
          // Remember the Hive username for next visit
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
          const info = {
            username: (result as { username?: string })?.username,
            success: (result as { success?: boolean })?.success,
            errorCode: (result as { errorCode?: number })?.errorCode,
          };
          console.debug('Aioha login result validation failed:', info);
          throw new Error(
            (result as { error?: string })?.error ||
              'Invalid authentication result. Please try again.'
          );
        }
      } catch (error) {
        logger.error('Aioha login failed', 'useAuthPage', error);
        setErrorMessage(
          'Login failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [aioha, hiveUsername, isAddAccountFlow, isInitialized, loginWithAioha, resetHivePrompt, router]
  );

  const onProviderSelect = useCallback(
    (provider: string) => {
      setSelectedProvider(provider);
      performAiohaLogin(provider);
    },
    [performAiohaLogin]
  );

  const onHiveUsernameSubmit = useCallback(() => {
    if (!selectedProvider) return;
    performAiohaLogin(selectedProvider);
  }, [performAiohaLogin, selectedProvider]);

  const onHiveUsernameCancel = useCallback(() => {
    resetConnectionState();
    resetHivePrompt();
  }, [resetConnectionState, resetHivePrompt]);

  const togglePasswordVisibility = useCallback(() => {
    updateEmailField('showPassword', !emailForm.showPassword);
  }, [emailForm.showPassword, updateEmailField]);

  /**
   * Handle login result from AiohaModal
   * This is called when the user successfully authenticates via any provider in the modal
   */
  const handleAiohaModalLogin = useCallback(
    async (result: LoginResult) => {
      // LoginResult is a discriminated union - check success first
      if (!result.success) {
        // result is now typed as LoginResultError which has error and errorCode
        setErrorMessage('Login failed: ' + result.error || 'Unknown error');
        return;
      }

      // TypeScript now knows result is LoginResultSuccess with username, provider, etc.
      // LoginResultSuccess.username is required (not optional) per Aioha's types
      const successResult: LoginResultSuccess = result;

      setIsConnecting(true);
      setErrorMessage(null);

      try {
        // LoginResultSuccess guarantees username is present
        let username: string = successResult.username;

        // Fallback: if username is empty string, try to get from aioha instance
        if (!username && aioha) {
          const aiohaInstance = aioha as {
            getCurrentUser?: () => string;
            user?: { username?: string };
            username?: string;
          };
          const instanceUsername =
            aiohaInstance.getCurrentUser?.() ||
            aiohaInstance.user?.username ||
            aiohaInstance.username;
          if (instanceUsername) {
            username = instanceUsername;
          }
        }

        // Convert LoginResult to the format expected by loginWithAioha
        const loginResult: AiohaLoginResult = {
          username,
          provider: successResult.provider,
          success: true,
        };

        await loginWithAioha(loginResult);
        // Remember the Hive username for next visit
        if (username) {
          try {
            localStorage.setItem(REMEMBERED_HIVE_USERNAME_KEY, username);
          } catch {
            // localStorage may be unavailable
          }
        }
        setShowAiohaModal(false);
        router.push('/sportsbites');
      } catch (error) {
        logger.error('Aioha modal login failed', 'useAuthPage', error);
        setErrorMessage(
          'Login failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        );
      } finally {
        setIsConnecting(false);
      }
    },
    [loginWithAioha, router, aioha]
  );

  return {
    mode,
    toggleMode,
    isConnecting,
    errorMessage,
    successMessage,
    dismissError,
    availableProviders,
    isAiohaReady,
    showHiveUsernameInput,
    selectedProvider,
    hiveUsername,
    onHiveUsernameChange: setHiveUsername,
    onHiveUsernameSubmit,
    onHiveUsernameCancel,
    onProviderSelect,
    emailForm,
    updateEmailField,
    togglePasswordVisibility,
    handleEmailSubmit,
    handleGoogleSignIn,
    handleForgotPassword,
    showAiohaModal,
    openAiohaModal,
    closeAiohaModal,
    setShowAiohaModal,
    handleAiohaModalLogin,
    resetConnectionState,
  };
};
