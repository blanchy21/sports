import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletProvider';
import { HiveAuthState, DiscoveredAccount } from '../types';
import { logger } from '@/lib/logger';

export const useHiveAuth = () => {
  const { loginWithHiveUser, loginWithWallet } = useAuth();
  const wallet = useWallet();

  const [hiveState, setHiveState] = useState<HiveAuthState>({
    hiveUsername: '',
    showHiveUsernameInput: false,
    showAccountDiscovery: false,
    discoveredAccounts: [],
    availableProviders: [],
    selectedProvider: null,
  });

  const updateHiveField = useCallback(
    (field: keyof HiveAuthState, value: string | boolean | string[] | DiscoveredAccount[]) => {
      setHiveState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleHiveKeychainLogin = useCallback(async () => {
    if (!hiveState.hiveUsername.trim()) return;

    try {
      await loginWithHiveUser(hiveState.hiveUsername);
    } catch (error) {
      logger.error('Hive Keychain login failed', 'useHiveAuth', error);
      throw error;
    }
  }, [hiveState.hiveUsername, loginWithHiveUser]);

  const handleWalletLogin = useCallback(
    async (provider: string) => {
      if (!wallet.isReady) {
        throw new Error('Wallet not ready');
      }

      try {
        const usernameToUse = provider === 'keychain' ? hiveState.hiveUsername.trim() : '';
        const result = await wallet.login(provider as 'keychain' | 'hivesigner', usernameToUse);

        if (result.success) {
          await loginWithWallet(result);
        } else {
          throw new Error(result.error || 'Login failed');
        }
      } catch (error) {
        logger.error('Wallet login failed', 'useHiveAuth', error);
        throw error;
      }
    },
    [hiveState.hiveUsername, wallet, loginWithWallet]
  );

  const handleAccountDiscovery = useCallback(async () => {
    if (!wallet.isReady) {
      throw new Error('Wallet not ready');
    }

    try {
      const mockAccounts: DiscoveredAccount[] = [
        { username: 'user1', provider: 'keychain', balance: '100.5' },
        { username: 'user2', provider: 'hivesigner', balance: '50.2' },
      ];

      updateHiveField('discoveredAccounts', mockAccounts);
      updateHiveField('showAccountDiscovery', true);
    } catch (error) {
      logger.error('Account discovery failed', 'useHiveAuth', error);
      throw error;
    }
  }, [wallet, updateHiveField]);

  const handleAccountSelect = useCallback(
    async (account: DiscoveredAccount) => {
      try {
        const result = await wallet.login(
          account.provider as 'keychain' | 'hivesigner',
          account.username
        );

        if (result.success) {
          await loginWithWallet(result);
        } else {
          throw new Error(result.error || 'Login failed');
        }
      } catch (error) {
        logger.error('Account selection failed', 'useHiveAuth', error);
        throw error;
      }
    },
    [wallet, loginWithWallet]
  );

  return {
    hiveState,
    updateHiveField,
    handleHiveKeychainLogin,
    handleWalletLogin,
    handleAccountDiscovery,
    handleAccountSelect,
  };
};
