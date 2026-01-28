import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckCircle, Download, Star, Wallet } from 'lucide-react';

interface HiveWalletSectionProps {
  providers: string[];
  isConnecting: boolean;
  onProviderSelect: (provider: string) => void;
}

export const HiveWalletSection: React.FC<HiveWalletSectionProps> = ({
  providers,
  isConnecting,
  onProviderSelect,
}) => {
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'keychain':
        return (
          <Image
            src="/hive-keychain-logo.svg"
            alt="Hive Keychain"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        );
      case 'hivesigner':
        return (
          <Image
            src="/hivesigner-icon.png"
            alt="HiveSigner"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        );
      case 'hiveauth':
        return (
          <Image
            src="/hiveauth-logo.png"
            alt="HiveAuth"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        );
      case 'ledger':
        return (
          <Image src="/ledger-logo.png" alt="Ledger" width={32} height={32} className="h-8 w-8" />
        );
      case 'metamasksnap':
        return (
          <Image
            src="/metamask-fox.svg"
            alt="MetaMask"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        );
      case 'peakvault':
        return <span className="text-2xl">⛰️</span>;
      default:
        return <span className="text-2xl">💳</span>;
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
      case 'metamasksnap':
        return 'MetaMask';
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
      case 'metamasksnap':
        return 'MetaMask Snap';
      default:
        return 'Wallet';
    }
  };

  return (
    <div className="mb-8">
      <div className="mb-6 text-center">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">Connect with Hive Blockchain</h3>
        <p className="text-sm text-slate-600">
          Choose your preferred wallet to access the full Hive ecosystem
        </p>
      </div>

      <div className="space-y-3">
        {providers.map((provider, index) => {
          const isRecommended = index < 3;

          return (
            <Button
              key={provider}
              onClick={() => onProviderSelect(provider)}
              disabled={isConnecting}
              className={`flex h-16 w-full items-center justify-start space-x-4 border-2 bg-card ${
                isRecommended
                  ? 'border-primary/30 bg-primary/5 hover:border-primary'
                  : 'border-border hover:border-primary hover:bg-primary/5'
              } relative text-foreground transition-all duration-200 disabled:opacity-50`}
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                {getProviderIcon(provider)}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center space-x-2">
                  <div className="text-base font-semibold">{getProviderName(provider)}</div>
                  {isRecommended && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {getProviderDescription(provider)}
                </div>
              </div>
              <div className="text-muted-foreground">
                <Wallet className="h-5 w-5" />
              </div>
            </Button>
          );
        })}

        {providers.length === 0 && (
          <Card className="border-accent/20 bg-accent/10 p-6 text-center">
            <div className="mb-3 text-accent">
              <div className="mb-2 text-sm font-medium">No Hive Wallets Detected</div>
              <div className="mb-3 text-xs text-accent/80">
                Install a Hive wallet to connect to the blockchain
              </div>
              <div className="space-y-1 text-xs text-accent/80">
                <div>• Install Hive Keychain browser extension</div>
                <div>• Use HiveSigner web wallet</div>
                <div>• Download HiveAuth mobile app</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-accent/30 bg-card text-xs text-accent hover:bg-accent/10"
              onClick={() =>
                window.open(
                  'https://chrome.google.com/webstore/detail/hive-keychain/poipeahgbjcobddaglhciijbnfkmemoh',
                  '_blank'
                )
              }
            >
              <Download className="mr-1 h-3 w-3" />
              Download Hive Keychain
            </Button>
          </Card>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start space-x-2">
          <Star className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <h4 className="text-sm font-medium text-foreground">Why choose Hive Blockchain?</h4>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <BenefitItem text="Earn crypto rewards for quality content" />
              <BenefitItem text="Vote and participate in governance" />
              <BenefitItem text="Decentralized and censorship-resistant" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BenefitItem: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center space-x-2">
    <CheckCircle className="h-3 w-3" />
    <span>{text}</span>
  </div>
);

export default HiveWalletSection;
