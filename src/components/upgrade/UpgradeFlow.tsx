'use client';

import React, { useState } from 'react';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { X, Zap, Shield, Star, CheckCircle, ArrowRight, Wallet, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletProvider';
import { isKeychainAvailable } from '@/lib/wallet/detect';
import { logger } from '@/lib/logger';

interface UpgradeFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeFlow: React.FC<UpgradeFlowProps> = ({ isOpen, onClose }) => {
  const { user, upgradeToHive } = useAuth();
  const wallet = useWallet();

  const [step, setStep] = useState<'intro' | 'wallet' | 'connecting' | 'success'>('intro');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hiveUsername, setHiveUsername] = useState('');
  const [showHiveUsernameInput, setShowHiveUsernameInput] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const handleWalletSelection = (provider: string) => {
    if (provider === 'keychain') {
      setSelectedProvider(provider);
      setShowHiveUsernameInput(true);
    } else {
      handleConnectWallet(provider);
    }
  };

  const handleConnectWallet = async (provider: string) => {
    if (!wallet.isReady) {
      setErrorMessage('Wallet is not available. Please refresh the page and try again.');
      return;
    }

    if (provider === 'keychain' && !isKeychainAvailable()) {
      setErrorMessage(
        'Hive Keychain extension not detected. Please install it and refresh the page.'
      );
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);
    setStep('connecting');

    try {
      const usernameToUse = provider === 'keychain' ? hiveUsername.trim() : '';

      const result = await wallet.login(provider as 'keychain' | 'hivesigner', usernameToUse);

      if (result.success) {
        await upgradeToHive(result.username);
        setStep('success');
      } else {
        throw new Error(result.error || 'Invalid authentication result');
      }
    } catch (error) {
      logger.error('Wallet connection failed', 'UpgradeFlow', error);
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
      default:
        return 'Wallet';
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-2xl font-bold text-foreground">
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
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  Unlock Your Earning Potential
                </h3>
                <p className="text-foreground/70">
                  Connect your Hive wallet to start earning crypto rewards for your sports content
                  and engagement.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-success/15">
                    <Zap className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Earn Crypto Rewards</h4>
                    <p className="text-sm text-foreground/70">
                      Get paid in HIVE and HBD for quality content and engagement
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-info/15">
                    <Shield className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Full Blockchain Access</h4>
                    <p className="text-sm text-foreground/70">
                      Vote, comment, and participate in Hive governance
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                    <Star className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Keep Your Content</h4>
                    <p className="text-sm text-foreground/70">
                      Your existing posts will be preserved and can earn rewards
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-info/30 bg-info/10 p-4">
                <div className="flex items-start space-x-2">
                  <div className="mt-0.5 h-4 w-4 text-sm text-info">ℹ️</div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">What happens next?</h4>
                    <p className="mt-1 text-xs text-info">
                      You&apos;ll connect your Hive wallet, and your account will be upgraded to a
                      full Hive account. All your existing content will be preserved and can start
                      earning rewards.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep('wallet')}
                className="h-12 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-base font-semibold text-white hover:from-blue-700 hover:to-purple-700"
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
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-info/15">
                  <Wallet className="h-6 w-6 text-info" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  Choose Your Hive Wallet
                </h3>
                <p className="text-foreground/70">
                  Select your preferred wallet to connect to the Hive blockchain
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="mt-1 text-xs text-destructive underline hover:text-destructive/80"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Hive Username Input */}
              {showHiveUsernameInput && (
                <Card className="border-warning/30 bg-warning/10 p-4">
                  <h4 className="mb-2 text-sm font-medium text-warning">
                    Enter your Hive username for Hive Keychain
                  </h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={hiveUsername}
                      onChange={(e) => setHiveUsername(e.target.value)}
                      placeholder="Enter your Hive username (e.g., blanchy)"
                      className="flex-1 rounded-md border border-warning/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warning"
                      onKeyDown={(e) =>
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
                  <p className="mt-1 text-xs text-warning">
                    This will open Hive Keychain to sign in as @{hiveUsername || 'your-username'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProvider(null);
                      setHiveUsername('');
                      setShowHiveUsernameInput(false);
                      setErrorMessage(null);
                    }}
                    className="mt-1 text-xs text-warning underline hover:text-warning/80"
                  >
                    Cancel
                  </button>
                </Card>
              )}

              {/* Wallet Provider Buttons */}
              <div className="space-y-3">
                {wallet.availableProviders.map((provider) => (
                  <Button
                    key={provider}
                    onClick={() => handleWalletSelection(provider)}
                    disabled={isConnecting}
                    className="flex h-16 w-full items-center justify-start space-x-4 border-2 border-border bg-card text-foreground/80 transition-all duration-200 hover:border-info/30 hover:bg-info/10 disabled:opacity-50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/15 text-2xl">
                      {getProviderIcon(provider)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-base font-semibold">{getProviderName(provider)}</div>
                      <div className="text-sm text-muted-foreground">
                        {getProviderDescription(provider)}
                      </div>
                    </div>
                    <div className="text-muted-foreground/70">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </Button>
                ))}

                {/* No providers available message */}
                {wallet.availableProviders.length === 0 && (
                  <Card className="border-warning/30 bg-warning/10 p-6 text-center">
                    <div className="mb-3 text-warning">
                      <div className="mb-2 text-sm font-medium">No Hive Wallets Detected</div>
                      <div className="mb-3 text-xs text-warning/80">
                        Install a Hive wallet to connect to the blockchain
                      </div>
                      <div className="space-y-1 text-xs text-warning/80">
                        <div>• Install Hive Keychain browser extension</div>
                        <div>• Use HiveSigner web wallet</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-warning/30 bg-card text-xs text-warning hover:bg-warning/15"
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-info/15">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-info border-t-transparent"></div>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  Connecting to Hive...
                </h3>
                <p className="text-foreground/70">Please approve the connection in your wallet</p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">Upgrade Complete!</h3>
                <p className="text-foreground/70">
                  Your account has been successfully upgraded to a Hive account. You can now earn
                  crypto rewards!
                </p>
              </div>

              <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-success" />
                  <div>
                    <h4 className="text-sm font-medium text-foreground">What&apos;s next?</h4>
                    <ul className="mt-1 space-y-1 text-xs text-success">
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
                className="h-12 w-full bg-success text-base font-semibold text-white hover:bg-success/90"
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
