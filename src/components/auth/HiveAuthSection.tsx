import React from 'react';
import { Button } from '@/components/ui/Button';
import { HiveAuthSectionProps, DiscoveredAccount } from './types';
import { useHiveAuth } from './hooks/useHiveAuth';
import { ProviderButtons } from './ProviderButtons';
import { AccountDiscovery } from './AccountDiscovery';

export const HiveAuthSection: React.FC<HiveAuthSectionProps> = ({
  isConnecting,
  errorMessage,
  onError,
  onSuccess,
}) => {
  const {
    hiveState,
    updateHiveField,
    handleAiohaLogin,
    handleAccountDiscovery,
    handleAccountSelect,
  } = useHiveAuth();

  const handleProviderSelect = async (provider: string) => {
    try {
      updateHiveField('selectedProvider', provider);
      
      if (provider === 'keychain' || provider === 'hiveauth') {
        updateHiveField('showHiveUsernameInput', true);
      } else {
        await handleAiohaLogin(provider);
        onSuccess();
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Authentication failed');
    }
  };

  const handleUsernameSubmit = async () => {
    if (!hiveState.selectedProvider) return;
    
    try {
      await handleAiohaLogin(hiveState.selectedProvider);
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Authentication failed');
    }
  };

  const handleDiscover = async () => {
    try {
      await handleAccountDiscovery();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Account discovery failed');
    }
  };

  const handleAccountSelection = async (account: DiscoveredAccount) => {
    try {
      await handleAccountSelect(account);
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Account selection failed');
    }
  };

  return (
    <div className="p-6 bg-gray-50/50">
      <h3 className="text-lg font-semibold mb-4">
        Or connect with Hive Blockchain
      </h3>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{errorMessage}</p>
          <button
            onClick={() => onError('')}
            className="text-red-600 hover:text-red-800 text-xs mt-1 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hive Username Input */}
      {hiveState.showHiveUsernameInput && (
        <div className="mb-3 p-3 bg-maximum-yellow/10 border border-maximum-yellow/20 rounded-lg">
          <h4 className="font-medium text-sm text-maximum-yellow mb-2">
            Enter your Hive username for {hiveState.selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth'}
          </h4>
          <div className="flex space-x-2">
            <input
              type="text"
              value={hiveState.hiveUsername}
              onChange={(e) => updateHiveField('hiveUsername', e.target.value)}
              placeholder="Enter your Hive username (e.g., blanchy)"
              className="flex-1 px-3 py-2 border border-maximum-yellow/30 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-maximum-yellow"
              onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
            />
            <Button
              onClick={handleUsernameSubmit}
              disabled={!hiveState.hiveUsername.trim() || isConnecting}
              size="sm"
              className="px-3"
            >
              Continue
            </Button>
          </div>
          <p className="text-xs text-maximum-yellow mt-1">
            This will open {hiveState.selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth'} to sign in as @{hiveState.hiveUsername || "your-username"}
          </p>
        </div>
      )}

      {/* Aioha Authentication Section */}
      <div className="space-y-3">
        <div className="text-center">
          <h4 className="text-base font-semibold text-gray-800 mb-1">
            Connect with Hive Blockchain
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            Choose your preferred wallet to access the Hive ecosystem
          </p>
        </div>

        {/* Provider Buttons */}
        <ProviderButtons
          availableProviders={hiveState.availableProviders}
          selectedProvider={hiveState.selectedProvider}
          onProviderSelect={handleProviderSelect}
          isConnecting={isConnecting}
        />

        {/* Account Discovery */}
        <AccountDiscovery
          discoveredAccounts={hiveState.discoveredAccounts}
          isConnecting={isConnecting}
          onAccountSelect={handleAccountSelection}
          onDiscover={handleDiscover}
        />
      </div>

      {/* Google Login Button */}
      <Button
        className="w-full py-2 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 mt-4"
      >
        <div className="w-8 h-8 flex items-center justify-center bg-blue-500 rounded text-white font-bold text-sm">
          G
        </div>
        <span className="font-medium">
          Login with Google
        </span>
      </Button>

      {/* Benefits */}
      <div className="mt-4 p-3 bg-card rounded-lg border border-border">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Why connect with Hive?</h5>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Earn rewards for your content</li>
          <li>• Vote on posts and comments</li>
          <li>• Access exclusive features</li>
          <li>• Join the decentralized community</li>
        </ul>
      </div>
    </div>
  );
};
