import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckCircle, Download, Star, Wallet } from "lucide-react";

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
      case "keychain":
        return (
          <Image src="/hive-keychain-logo.svg" alt="Hive Keychain" width={32} height={32} className="w-8 h-8" />
        );
      case "hivesigner":
        return (
          <Image src="/hivesigner-icon.png" alt="HiveSigner" width={32} height={32} className="w-8 h-8" />
        );
      case "hiveauth":
        return <Image src="/hiveauth-logo.png" alt="HiveAuth" width={32} height={32} className="w-8 h-8" />;
      case "ledger":
        return <Image src="/ledger-logo.png" alt="Ledger" width={32} height={32} className="w-8 h-8" />;
      case "metamasksnap":
        return <Image src="/metamask-fox.svg" alt="MetaMask" width={32} height={32} className="w-8 h-8" />;
      case "peakvault":
        return <span className="text-2xl">⛰️</span>;
      default:
        return <span className="text-2xl">💳</span>;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "keychain":
        return "Hive Keychain";
      case "hivesigner":
        return "HiveSigner";
      case "hiveauth":
        return "HiveAuth";
      case "ledger":
        return "Ledger";
      case "peakvault":
        return "Peak Vault";
      case "metamasksnap":
        return "MetaMask";
      default:
        return provider;
    }
  };

  const getProviderDescription = (provider: string) => {
    switch (provider) {
      case "keychain":
        return "Browser Extension";
      case "hivesigner":
        return "Web Wallet";
      case "hiveauth":
        return "Mobile App";
      case "ledger":
        return "Hardware Wallet";
      case "peakvault":
        return "Advanced Wallet";
      case "metamasksnap":
        return "MetaMask Snap";
      default:
        return "Wallet";
    }
  };

  return (
    <div className="mb-8">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Connect with Hive Blockchain</h3>
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
              className={`w-full h-16 flex items-center justify-start space-x-4 bg-card border-2 ${
                isRecommended ? "border-primary/30 hover:border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-primary/5"
              } text-foreground disabled:opacity-50 transition-all duration-200 relative`}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden">
                {getProviderIcon(provider)}
              </div>
              <div className="text-left flex-1">
                <div className="flex items-center space-x-2">
                  <div className="font-semibold text-base">{getProviderName(provider)}</div>
                  {isRecommended && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{getProviderDescription(provider)}</div>
              </div>
              <div className="text-muted-foreground">
                <Wallet className="h-5 w-5" />
              </div>
            </Button>
          );
        })}

        {providers.length === 0 && (
          <Card className="p-6 text-center border-accent/20 bg-accent/10">
            <div className="text-accent mb-3">
              <div className="text-sm font-medium mb-2">No Hive Wallets Detected</div>
              <div className="text-xs text-accent/80 mb-3">Install a Hive wallet to connect to the blockchain</div>
              <div className="space-y-1 text-xs text-accent/80">
                <div>• Install Hive Keychain browser extension</div>
                <div>• Use HiveSigner web wallet</div>
                <div>• Download HiveAuth mobile app</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-card border-accent/30 text-accent hover:bg-accent/10"
              onClick={() =>
                window.open(
                  "https://chrome.google.com/webstore/detail/hive-keychain/poipeahgbjcobddaglhciijbnfkmemoh",
                  "_blank"
                )
              }
            >
              <Download className="h-3 w-3 mr-1" />
              Download Hive Keychain
            </Button>
          </Card>
        )}
      </div>

      <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-start space-x-2">
          <Star className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-sm text-foreground">Why choose Hive Blockchain?</h4>
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

