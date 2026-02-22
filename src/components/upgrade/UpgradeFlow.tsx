'use client';

import React, { useState } from 'react';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { X, Zap, Shield, Star, CheckCircle, ArrowRight, Wallet, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAioha } from '@/contexts/AiohaProvider';
import { logger } from '@/lib/logger';
// import { AiohaModal } from "@aioha/react-ui";
import { Providers, KeyTypes } from '@aioha/aioha';

interface UpgradeFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeFlow: React.FC<UpgradeFlowProps> = ({ isOpen, onClose }) => {
  const { user, upgradeToHive } = useAuth();
  const { aioha, isInitialized } = useAioha();

  const [step, setStep] = useState<'intro' | 'wallet' | 'connecting' | 'success'>('intro');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hiveUsername, setHiveUsername] = useState('');
  const [showHiveUsernameInput, setShowHiveUsernameInput] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Check available providers when Aioha is initialized
  React.useEffect(() => {
    if (!aioha || !isInitialized) return;

    try {
      const providers = (aioha as { getProviders: () => unknown[] }).getProviders();
      const providerStrings = providers.map((provider: unknown) => {
        const providerValue = provider as Providers;
        switch (providerValue) {
          case Providers.Keychain:
            return 'keychain';
          case Providers.HiveSigner:
            return 'hivesigner';
          case Providers.HiveAuth:
            return 'hiveauth';
          case Providers.Ledger:
            return 'ledger';
          case Providers.PeakVault:
            return 'peakvault';
          default:
            return String(provider);
        }
      });

      setAvailableProviders(providerStrings);
    } catch (error) {
      logger.error('Error getting available providers', 'UpgradeFlow', error);
    }
  }, [aioha, isInitialized]);

  const handleWalletSelection = (provider: string) => {
    if (provider === 'keychain' || provider === 'hiveauth') {
      setSelectedProvider(provider);
      setShowHiveUsernameInput(true);
    } else {
      handleConnectWallet(provider);
    }
  };

  const handleConnectWallet = async (provider: string) => {
    if (!isInitialized || !aioha) {
      setErrorMessage(
        'Aioha authentication is not available. Please refresh the page and try again.'
      );
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);
    setStep('connecting');

    try {
      const availableProviders = (aioha as { getProviders: () => unknown[] }).getProviders();

      let providerEnum;
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
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      if (!availableProviders.includes(providerEnum)) {
        throw new Error(
          `${provider} is not available. Please install the required wallet or try a different provider.`
        );
      }

      let usernameToUse = '';
      if (provider === 'keychain' || provider === 'hiveauth') {
        usernameToUse = hiveUsername.trim();
      }

      const result = await (
        aioha as {
          login: (provider: unknown, username: string, options: unknown) => Promise<unknown>;
        }
      ).login(providerEnum, usernameToUse, {
        msg: 'Upgrade to Hive account on Sportsblock',
        keyType: KeyTypes.Posting,
      });

      if (
        result &&
        (result as { username?: string }).username &&
        (result as { success?: boolean }).success !== false
      ) {
        // Upgrade the account to Hive
        await upgradeToHive((result as { username: string }).username);

        setStep('success');
      } else {
        throw new Error((result as { error?: string })?.error || 'Invalid authentication result');
      }
    } catch (error) {
      setErrorMessage(
        'Connection failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
      setStep('wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'keychain':
        return '🔑';
      case 'hivesigner':
        return '🌐';
      case 'hiveauth':
        return '📱';
      case 'ledger':
        return '🔒';
      case 'peakvault':
        return '⛰️';
      default:
        return '💳';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'keychain':
        return 'Hive Keychain';
      case 'hivesigner':
        return 'HiveSigner';
      case 'hiveauth':
        return 'HiveAuth';
      case 'ledger':
        return 'Ledger';
      case 'peakvault':
        return 'Peak Vault';
      default:
        return provider;
    }
  };

  const getProviderDescription = (provider: string) => {
    switch (provider) {
      case 'keychain':
        return 'Browser Extension';
      case 'hivesigner':
        return 'Web Wallet';
      case 'hiveauth':
        return 'Mobile App';
      case 'ledger':
        return 'Hardware Wallet';
      case 'peakvault':
        return 'Advanced Wallet';
      default:
        return 'Wallet';
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {step === 'intro' && 'Upgrade to Hive Account'}
            {step === 'wallet' && 'Connect Your Hive Wallet'}
            {step === 'connecting' && 'Connecting...'}
            {step === 'success' && 'Upgrade Complete!'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {/* Intro Step */}
          {step === 'intro' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-yellow-400 to-orange-500">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  Unlock Your Earning Potential
                </h3>
                <p className="text-slate-600">
                  Connect your Hive wallet to start earning crypto rewards for your sports content
                  and engagement.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <Zap className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Earn Crypto Rewards</h4>
                    <p className="text-sm text-slate-600">
                      Get paid in HIVE and HBD for quality content and engagement
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Full Blockchain Access</h4>
                    <p className="text-sm text-slate-600">
                      Vote, comment, and participate in Hive governance
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                    <Star className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Keep Your Content</h4>
                    <p className="text-sm text-slate-600">
                      Your existing posts will be preserved and can earn rewards
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start space-x-2">
                  <div className="mt-0.5 h-4 w-4 text-sm text-blue-600">ℹ️</div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">What happens next?</h4>
                    <p className="mt-1 text-xs text-blue-700">
                      You&apos;ll connect your Hive wallet, and your account will be upgraded to a
                      full Hive account. All your existing content will be preserved and can start
                      earning rewards.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep('wallet')}
                className="h-12 w-full bg-linear-to-r from-blue-600 to-purple-600 text-base font-semibold text-white hover:from-blue-700 hover:to-purple-700"
              >
                Connect Hive Wallet
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Wallet Selection Step */}
          {step === 'wallet' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  Choose Your Hive Wallet
                </h3>
                <p className="text-slate-600">
                  Select your preferred wallet to connect to the Hive blockchain
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="mt-1 text-xs text-red-600 underline hover:text-red-800"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Hive Username Input */}
              {showHiveUsernameInput && (
                <Card className="border-yellow-200 bg-yellow-50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-yellow-800">
                    Enter your Hive username for{' '}
                    {selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth'}
                  </h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={hiveUsername}
                      onChange={(e) => setHiveUsername(e.target.value)}
                      placeholder="Enter your Hive username (e.g., blanchy)"
                      className="flex-1 rounded-md border border-yellow-300 px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-hidden"
                      onKeyPress={(e) =>
                        e.key === 'Enter' &&
                        selectedProvider &&
                        handleConnectWallet(selectedProvider)
                      }
                    />
                    <Button
                      onClick={() => selectedProvider && handleConnectWallet(selectedProvider)}
                      disabled={!hiveUsername.trim() || isConnecting}
                      size="sm"
                      className="px-3"
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-yellow-700">
                    This will open {selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth'}{' '}
                    to sign in as @{hiveUsername || 'your-username'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProvider(null);
                      setHiveUsername('');
                      setErrorMessage(null);
                    }}
                    className="mt-1 text-xs text-yellow-700 underline hover:text-yellow-800"
                  >
                    Cancel
                  </button>
                </Card>
              )}

              {/* Wallet Provider Buttons */}
              <div className="space-y-3">
                {availableProviders.map((provider) => (
                  <Button
                    key={provider}
                    onClick={() => handleWalletSelection(provider)}
                    disabled={isConnecting}
                    className="flex h-16 w-full items-center justify-start space-x-4 border-2 border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">
                      {getProviderIcon(provider)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-base font-semibold">{getProviderName(provider)}</div>
                      <div className="text-sm text-slate-500">
                        {getProviderDescription(provider)}
                      </div>
                    </div>
                    <div className="text-slate-400">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </Button>
                ))}

                {/* No providers available message */}
                {availableProviders.length === 0 && (
                  <Card className="border-yellow-200 bg-yellow-50 p-6 text-center">
                    <div className="mb-3 text-yellow-800">
                      <div className="mb-2 text-sm font-medium">No Hive Wallets Detected</div>
                      <div className="mb-3 text-xs text-yellow-600">
                        Install a Hive wallet to connect to the blockchain
                      </div>
                      <div className="space-y-1 text-xs text-yellow-600">
                        <div>• Install Hive Keychain browser extension</div>
                        <div>• Use HiveSigner web wallet</div>
                        <div>• Download HiveAuth mobile app</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-yellow-300 bg-white text-xs text-yellow-700 hover:bg-yellow-100"
                      onClick={() =>
                        window.open(
                          'https://chrome.google.com/webstore/detail/hive-keychain/poipeahgbjcobddaglhciijbnfkmemoh',
                          '_blank'
                        )
                      }
                    >
                      Download Hive Keychain
                    </Button>
                  </Card>
                )}
              </div>

              <Button variant="outline" onClick={() => setStep('intro')} className="w-full">
                Back
              </Button>
            </div>
          )}

          {/* Connecting Step */}
          {step === 'connecting' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">Connecting to Hive...</h3>
                <p className="text-slate-600">Please approve the connection in your wallet</p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-slate-900">Upgrade Complete!</h3>
                <p className="text-slate-600">
                  Your account has been successfully upgraded to a Hive account. You can now earn
                  crypto rewards!
                </p>
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900">What&apos;s next?</h4>
                    <ul className="mt-1 space-y-1 text-xs text-green-700">
                      <li>• Your existing content is preserved</li>
                      <li>• Start earning rewards for new content</li>
                      <li>• Vote and participate in governance</li>
                      <li>• Access all Hive blockchain features</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={onClose}
                className="h-12 w-full bg-green-600 text-base font-semibold text-white hover:bg-green-700"
              >
                Continue to Sportsblock
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
