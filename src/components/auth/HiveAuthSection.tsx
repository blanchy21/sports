'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/core/Button';
import { HiveAuthSectionProps } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletProvider';
import { isKeychainAvailable } from '@/lib/wallet/detect';
import { Loader2 } from 'lucide-react';

const PROVIDER_CONFIGS: Record<
  string,
  { name: string; description: string; icon: React.ReactNode }
> = {
  keychain: {
    name: 'Hive Keychain',
    description: 'Browser Extension',
    icon: (
      <Image
        src="/hive-keychain-logo.svg"
        alt="Hive Keychain"
        width={20}
        height={20}
        className="h-5 w-5"
      />
    ),
  },
  hivesigner: {
    name: 'HiveSigner',
    description: 'Web Wallet',
    icon: (
      <Image
        src="/hivesigner-icon.png"
        alt="HiveSigner"
        width={20}
        height={20}
        className="h-5 w-5"
      />
    ),
  },
};

export const HiveAuthSection: React.FC<HiveAuthSectionProps> = ({
  isConnecting,
  errorMessage,
  onError,
  onSuccess,
}) => {
  const { loginWithWallet } = useAuth();
  const wallet = useWallet();
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const [hiveUsername, setHiveUsername] = useState('');
  const [showUsernameInput, setShowUsernameInput] = useState(false);

  const handleWalletLogin = useCallback(
    async (provider: 'keychain' | 'hivesigner') => {
      if (provider === 'keychain' && !isKeychainAvailable()) {
        onError('Hive Keychain extension not detected. Please install it and refresh the page.');
        return;
      }

      if (provider === 'keychain' && !hiveUsername.trim()) {
        setShowUsernameInput(true);
        return;
      }

      setIsProcessingLogin(true);

      try {
        const usernameToUse = provider === 'keychain' ? hiveUsername.trim() : '';
        const result = await wallet.login(provider, usernameToUse);

        if (result.success) {
          await loginWithWallet(result);
          setShowUsernameInput(false);
          onSuccess();
        } else {
          onError(result.error || 'Login failed');
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to process login');
      } finally {
        setIsProcessingLogin(false);
      }
    },
    [wallet, loginWithWallet, hiveUsername, onError, onSuccess]
  );

  return (
    <div className="bg-gray-50/50 p-6">
      <h3 className="mb-4 text-lg font-semibold">Or connect with Hive Blockchain</h3>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2">
          <p className="text-sm text-red-800">{errorMessage}</p>
          <button
            onClick={() => onError('')}
            className="mt-1 text-xs text-red-600 underline hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="text-center">
          <h4 className="mb-1 text-base font-semibold text-gray-800">
            Connect with Hive Blockchain
          </h4>
          <p className="mb-3 text-xs text-gray-600">
            Choose your preferred wallet to access the Hive ecosystem
          </p>
        </div>

        {/* Loading state */}
        {!wallet.isReady && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-gray-600">Loading wallets...</span>
          </div>
        )}

        {/* Username input for Keychain */}
        {showUsernameInput && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <label className="mb-1 block text-sm font-medium text-yellow-800">
              Enter your Hive username for Keychain
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hiveUsername}
                onChange={(e) => setHiveUsername(e.target.value)}
                placeholder="e.g., blanchy"
                className="flex-1 rounded-md border border-yellow-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                onKeyDown={(e) => e.key === 'Enter' && handleWalletLogin('keychain')}
                autoFocus
              />
              <Button
                onClick={() => handleWalletLogin('keychain')}
                disabled={!hiveUsername.trim() || isProcessingLogin}
                size="sm"
              >
                {isProcessingLogin ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
            <button
              onClick={() => {
                setShowUsernameInput(false);
                setHiveUsername('');
              }}
              className="mt-1 text-xs text-yellow-700 underline hover:text-yellow-800"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Wallet Provider Buttons */}
        {wallet.isReady && (
          <div className="space-y-2">
            {wallet.availableProviders.map((provider) => {
              const config = PROVIDER_CONFIGS[provider];
              if (!config) return null;
              return (
                <Button
                  key={provider}
                  onClick={() => handleWalletLogin(provider)}
                  disabled={isConnecting || isProcessingLogin}
                  className="w-full bg-accent py-3 text-base font-semibold text-white hover:bg-accent/90"
                >
                  {isProcessingLogin ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {config.icon}
                      <span>{config.name}</span>
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {/* No providers message */}
        {wallet.isReady && wallet.availableProviders.length === 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="text-center">
              <div className="mb-2 text-sm font-medium text-yellow-800">
                Hive Wallet Connection Unavailable
              </div>
              <div className="mb-3 text-xs text-yellow-600">
                Unable to initialize wallet connection. Please try:
              </div>
              <div className="space-y-1 text-xs text-yellow-600">
                <div>• Refreshing the page</div>
                <div>• Installing Hive Keychain browser extension</div>
                <div>• Using HiveSigner web wallet</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="mt-4 rounded-lg border border-border bg-card p-3">
        <h5 className="mb-2 text-sm font-medium text-gray-700">Why connect with Hive?</h5>
        <ul className="space-y-1 text-xs text-gray-600">
          <li>• Earn rewards for your content</li>
          <li>• Vote on posts and comments</li>
          <li>• Access exclusive features</li>
          <li>• Join the decentralized community</li>
        </ul>
      </div>
    </div>
  );
};
