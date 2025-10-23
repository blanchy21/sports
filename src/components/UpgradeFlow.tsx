"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  X, 
  Zap, 
  Shield, 
  Star, 
  CheckCircle, 
  ArrowRight,
  Wallet,
  Crown
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAioha } from "@/contexts/AiohaProvider";
// import { AiohaModal } from "@aioha/react-ui";
import { Providers, KeyTypes } from "@aioha/aioha";

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
  const [hiveUsername, setHiveUsername] = useState("");
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
      console.error("Error getting available providers:", error);
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
      setErrorMessage("Aioha authentication is not available. Please refresh the page and try again.");
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
        throw new Error(`${provider} is not available. Please install the required wallet or try a different provider.`);
      }
      
      let usernameToUse = '';
      if (provider === 'keychain' || provider === 'hiveauth') {
        usernameToUse = hiveUsername.trim();
      }
      
      const result = await (aioha as { login: (provider: unknown, username: string, options: unknown) => Promise<unknown> }).login(providerEnum, usernameToUse, {
        msg: 'Upgrade to Hive account on Sportsblock',
        keyType: KeyTypes.Posting
      });
      
      if (result && (result as { username?: string }).username && 
          ((result as { success?: boolean }).success !== false)) {
        console.log("Aioha login successful, upgrading account...");
        
        // Upgrade the account to Hive
        await upgradeToHive((result as { username: string }).username);
        
        setStep('success');
      } else {
        throw new Error((result as { error?: string })?.error || "Invalid authentication result");
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      setErrorMessage("Connection failed: " + (error instanceof Error ? error.message : "Unknown error"));
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-900">
            {step === 'intro' && 'Upgrade to Hive Account'}
            {step === 'wallet' && 'Connect Your Hive Wallet'}
            {step === 'connecting' && 'Connecting...'}
            {step === 'success' && 'Upgrade Complete!'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {/* Intro Step */}
          {step === 'intro' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Unlock Your Earning Potential
                </h3>
                <p className="text-slate-600">
                  Connect your Hive wallet to start earning crypto rewards for your sports content and engagement.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Earn Crypto Rewards</h4>
                    <p className="text-sm text-slate-600">Get paid in HIVE and HBD for quality content and engagement</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Full Blockchain Access</h4>
                    <p className="text-sm text-slate-600">Vote, comment, and participate in Hive governance</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Star className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Keep Your Content</h4>
                    <p className="text-sm text-slate-600">Your existing posts will be preserved and can earn rewards</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="w-4 h-4 text-blue-600 mt-0.5 text-sm">ℹ️</div>
                  <div>
                    <h4 className="font-medium text-blue-900 text-sm">What happens next?</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      You&apos;ll connect your Hive wallet, and your account will be upgraded to a full Hive account. 
                      All your existing content will be preserved and can start earning rewards.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep('wallet')}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Connect Hive Wallet
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Wallet Selection Step */}
          {step === 'wallet' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Choose Your Hive Wallet
                </h3>
                <p className="text-slate-600">
                  Select your preferred wallet to connect to the Hive blockchain
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{errorMessage}</p>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-600 hover:text-red-800 text-xs mt-1 underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Hive Username Input */}
              {showHiveUsernameInput && (
                <Card className="p-4 border-yellow-200 bg-yellow-50">
                  <h4 className="font-medium text-sm text-yellow-800 mb-2">
                    Enter your Hive username for {selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth'}
                  </h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={hiveUsername}
                      onChange={(e) => setHiveUsername(e.target.value)}
                      placeholder="Enter your Hive username (e.g., blanchy)"
                      className="flex-1 px-3 py-2 border border-yellow-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      onKeyPress={(e) => e.key === 'Enter' && selectedProvider && handleConnectWallet(selectedProvider)}
                    />
                    <Button
                      onClick={() => selectedProvider && handleConnectWallet(selectedProvider)}
                      disabled={!hiveUsername.trim() || isConnecting}
                      size="sm"
                      className="px-3"
                    >
                      {isConnecting ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    This will open {selectedProvider === 'keychain' ? 'Hive Keychain' : 'HiveAuth'} to sign in as @{hiveUsername || "your-username"}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProvider(null);
                      setHiveUsername("");
                      setErrorMessage(null);
                    }}
                    className="text-xs text-yellow-700 hover:text-yellow-800 underline mt-1"
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
                    className="w-full h-16 flex items-center justify-start space-x-4 bg-white border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 disabled:opacity-50 transition-all duration-200"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                      {getProviderIcon(provider)}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-base">{getProviderName(provider)}</div>
                      <div className="text-sm text-slate-500">{getProviderDescription(provider)}</div>
                    </div>
                    <div className="text-slate-400">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </Button>
                ))}

                {/* No providers available message */}
                {availableProviders.length === 0 && (
                  <Card className="p-6 text-center border-yellow-200 bg-yellow-50">
                    <div className="text-yellow-800 mb-3">
                      <div className="text-sm font-medium mb-2">No Hive Wallets Detected</div>
                      <div className="text-xs text-yellow-600 mb-3">
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
                      className="text-xs bg-white border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                      onClick={() => window.open('https://chrome.google.com/webstore/detail/hive-keychain/poipeahgbjcobddaglhciijbnfkmemoh', '_blank')}
                    >
                      Download Hive Keychain
                    </Button>
                  </Card>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setStep('intro')}
                className="w-full"
              >
                Back
              </Button>
            </div>
          )}

          {/* Connecting Step */}
          {step === 'connecting' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Connecting to Hive...
                </h3>
                <p className="text-slate-600">
                  Please approve the connection in your wallet
                </p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Upgrade Complete!
                </h3>
                <p className="text-slate-600">
                  Your account has been successfully upgraded to a Hive account. You can now earn crypto rewards!
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 text-sm">What&apos;s next?</h4>
                    <ul className="text-xs text-green-700 mt-1 space-y-1">
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
                className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
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
