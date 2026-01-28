import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAioha } from '@/contexts/AiohaProvider';
import { HiveAuthState, DiscoveredAccount } from '../types';

export const useHiveAuth = () => {
  const { loginWithHiveUser, loginWithAioha } = useAuth();
  const { aioha, isInitialized } = useAioha();

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
      console.error('Hive Keychain login failed:', error);
      throw error;
    }
  }, [hiveState.hiveUsername, loginWithHiveUser]);

  const handleAiohaLogin = useCallback(
    async (provider: string) => {
      if (!isInitialized || !aioha) {
        throw new Error('Aioha not initialized');
      }

      try {
        if (provider === 'keychain' || provider === 'hiveauth') {
          if (!hiveState.hiveUsername.trim()) {
            throw new Error('Username is required for this provider');
          }
          // Handle provider-specific login logic
          await loginWithAioha({ username: hiveState.hiveUsername, provider });
        } else {
          // Handle other providers
          await loginWithAioha({ provider });
        }
      } catch (error) {
        console.error('Aioha login failed:', error);
        throw error;
      }
    },
    [hiveState.hiveUsername, isInitialized, aioha, loginWithAioha]
  );

  const handleAccountDiscovery = useCallback(async () => {
    if (!isInitialized || !aioha) {
      throw new Error('Aioha not initialized');
    }

    try {
      // Simulate account discovery
      const mockAccounts: DiscoveredAccount[] = [
        { username: 'user1', provider: 'keychain', balance: '100.5' },
        { username: 'user2', provider: 'hiveauth', balance: '50.2' },
      ];

      updateHiveField('discoveredAccounts', mockAccounts);
      updateHiveField('showAccountDiscovery', true);
    } catch (error) {
      console.error('Account discovery failed:', error);
      throw error;
    }
  }, [isInitialized, aioha, updateHiveField]);

  const handleAccountSelect = useCallback(
    async (account: DiscoveredAccount) => {
      try {
        await loginWithAioha({ username: account.username, provider: account.provider });
      } catch (error) {
        console.error('Account selection failed:', error);
        throw error;
      }
    },
    [loginWithAioha]
  );

  return {
    hiveState,
    updateHiveField,
    handleHiveKeychainLogin,
    handleAiohaLogin,
    handleAccountDiscovery,
    handleAccountSelect,
  };
};
