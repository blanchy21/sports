'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/core/Button';
import { HiveAuthSectionProps } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { useAioha } from '@/contexts/AiohaProvider';
import { AiohaModal } from '@aioha/react-ui';
import { Loader2 } from 'lucide-react';
import { Providers } from '@aioha/aioha';

// Provider configurations for display
const PROVIDER_CONFIGS = {
  keychain: {
    name: 'Hive Keychain',
    description: 'Browser Extension',
    icon: '🔑',
  },
  hiveauth: {
    name: 'HiveAuth',
    description: 'Mobile App',
    icon: '📱',
  },
  hivesigner: {
    name: 'HiveSigner',
    description: 'Web Wallet',
    icon: '🌐',
  },
  peakvault: {
    name: 'Peak Vault',
    description: 'Advanced Wallet',
    icon: '⛰️',
  },
  ledger: {
    name: 'Ledger',
    description: 'Hardware Wallet',
    icon: '🔒',
  },
};

interface AiohaLoginResult {
  success: boolean;
  username?: string;
  provider?: Providers;
  publicKey?: string;
  result?: string;
  error?: string;
  errorCode?: number;
}

export const HiveAuthSection: React.FC<HiveAuthSectionProps> = ({
  isConnecting,
  errorMessage,
  onError,
  onSuccess,
}) => {
  const { loginWithAioha } = useAuth();
  const { aioha, isInitialized, error: aiohaError } = useAioha();
  const [showAiohaModal, setShowAiohaModal] = useState(false);
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);

  // Handle successful Aioha login
  const handleAiohaLogin = useCallback(
    async (result: AiohaLoginResult) => {
      if (!result.success) {
        onError(result.error || 'Login failed');
        return;
      }

      setIsProcessingLogin(true);

      try {
        // Pass the login result to AuthContext
        await loginWithAioha({
          username: result.username,
          provider: result.provider,
          session: result.result,
        });

        setShowAiohaModal(false);
        onSuccess();
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to process login');
      } finally {
        setIsProcessingLogin(false);
      }
    },
    [loginWithAioha, onError, onSuccess]
  );

  // Check if Aioha is available - explicit boolean to avoid unknown in JSX
  const isAiohaAvailable = isInitialized && aioha !== null;

  // Get available providers from Aioha
  const getAvailableProviders = (): string[] => {
    if (!isAiohaAvailable || !aioha) return [];

    try {
      const aiohaInstance = aioha as { getProviders?: () => string[] };
      if (typeof aiohaInstance.getProviders === 'function') {
        return aiohaInstance.getProviders();
      }
    } catch {
      // Fallback to default providers
    }

    return ['keychain', 'hiveauth', 'hivesigner'];
  };

  const availableProviders = getAvailableProviders();

  return (
    <div className="bg-gray-50/50 p-6">
      <h3 className="mb-4 text-lg font-semibold">Or connect with Hive Blockchain</h3>

      {/* Error Message */}
      {(errorMessage || aiohaError) && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2">
          <p className="text-sm text-red-800">{errorMessage ?? aiohaError ?? ''}</p>
          <button
            onClick={() => onError('')}
            className="mt-1 text-xs text-red-600 underline hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Aioha Authentication Section */}
      <div className="space-y-3">
        <div className="text-center">
          <h4 className="mb-1 text-base font-semibold text-gray-800">
            Connect with Hive Blockchain
          </h4>
          <p className="mb-3 text-xs text-gray-600">
            Choose your preferred wallet to access the Hive ecosystem
          </p>
        </div>

        {/* Loading state while Aioha initializes */}
        {!isInitialized && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-gray-600">Loading wallets...</span>
          </div>
        )}

        {/* Main Connect Button - Opens AiohaModal */}
        {isAiohaAvailable && (
          <Button
            onClick={() => setShowAiohaModal(true)}
            disabled={isConnecting || isProcessingLogin}
            className="w-full bg-accent py-3 text-base font-semibold text-white hover:bg-accent/90"
          >
            {isProcessingLogin ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Hive Wallet'
            )}
          </Button>
        )}

        {/* Show available provider icons */}
        {isAiohaAvailable && availableProviders.length > 0 && (
          <div className="flex justify-center gap-3 py-2">
            {availableProviders.slice(0, 4).map((provider) => {
              const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS];
              if (!config) return null;
              return (
                <div
                  key={provider}
                  className="flex flex-col items-center text-xs text-gray-500"
                  title={config.name}
                >
                  <span className="text-lg">{config.icon}</span>
                  <span className="mt-1">{config.name.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* No providers message */}
        {isInitialized && !isAiohaAvailable && (
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
                <div>• Using HiveAuth mobile app</div>
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

      {/* Aioha Modal */}
      {isAiohaAvailable && (
        <AiohaModal
          displayed={showAiohaModal}
          loginTitle="Connect to Sportsblock"
          loginHelpUrl="https://hive.io/wallets"
          loginOptions={{
            msg: 'Login to Sportsblock',
          }}
          onLogin={handleAiohaLogin}
          onClose={setShowAiohaModal}
          arrangement="list"
        />
      )}
    </div>
  );
};
