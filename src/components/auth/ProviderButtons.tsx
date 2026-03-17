import React from 'react';
import { Button } from '@/components/core/Button';
import { ProviderButtonsProps } from './types';

export const ProviderButtons: React.FC<ProviderButtonsProps> = ({
  availableProviders,
  onProviderSelect,
  isConnecting,
}) => {
  const providerConfigs = {
    keychain: {
      name: 'Hive Keychain',
      description: 'Browser Extension',
      icon: '🔑',
      color: 'bg-warning',
    },
    hiveauth: {
      name: 'HiveAuth',
      description: 'Mobile App',
      icon: '📱',
      color: 'bg-info',
    },
    hivesigner: {
      name: 'HiveSigner',
      description: 'Web Wallet',
      icon: '🌐',
      color: 'bg-success',
    },
    peakvault: {
      name: 'Peak Vault',
      description: 'Advanced Wallet',
      icon: '⛰️',
      color: 'bg-warning',
    },
  };

  return (
    <div className="space-y-2">
      {availableProviders.map((provider) => {
        const config = providerConfigs[provider as keyof typeof providerConfigs];
        if (!config) return null;

        return (
          <Button
            key={provider}
            onClick={() => onProviderSelect(provider)}
            disabled={isConnecting}
            className="flex w-full items-center justify-start space-x-3 border border-sb-border bg-sb-stadium py-2 text-sb-text-primary/80 hover:bg-sb-turf/50"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center ${config.color} rounded text-sm font-bold text-white`}
            >
              {config.icon}
            </div>
            <div className="text-left">
              <div className="font-medium">{config.name}</div>
              <div className="text-xs text-muted-foreground">{config.description}</div>
            </div>
          </Button>
        );
      })}

      {/* No providers available message */}
      {availableProviders.length === 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
          <div className="text-center">
            <div className="mb-2 text-sm font-medium text-warning">No Hive Wallets Detected</div>
            <div className="mb-3 text-xs text-warning/80">
              Install a Hive wallet to connect to the blockchain
            </div>
            <div className="space-y-1 text-xs text-warning/80">
              <div>• Install Hive Keychain browser extension</div>
              <div>• Use HiveSigner web wallet</div>
              <div>• Download HiveAuth mobile app</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
