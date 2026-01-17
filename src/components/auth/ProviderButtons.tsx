import React from 'react';
import { Button } from '@/components/ui/Button';
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
      color: 'bg-yellow-500',
    },
    hiveauth: {
      name: 'HiveAuth',
      description: 'Mobile App',
      icon: '📱',
      color: 'bg-blue-500',
    },
    hivesigner: {
      name: 'HiveSigner',
      description: 'Web Wallet',
      icon: '🌐',
      color: 'bg-green-500',
    },
    peakvault: {
      name: 'Peak Vault',
      description: 'Advanced Wallet',
      icon: '⛰️',
      color: 'bg-yellow-500',
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
            className="w-full py-2 flex items-center justify-start space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
          >
            <div className={`w-8 h-8 flex items-center justify-center ${config.color} rounded text-white font-bold text-sm`}>
              {config.icon}
            </div>
            <div className="text-left">
              <div className="font-medium">{config.name}</div>
              <div className="text-xs text-gray-500">{config.description}</div>
            </div>
          </Button>
        );
      })}

      {/* No providers available message */}
      {availableProviders.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-center">
            <div className="text-sm font-medium text-yellow-800 mb-2">
              No Hive Wallets Detected
            </div>
            <div className="text-xs text-yellow-600 mb-3">
              Install a Hive wallet to connect to the blockchain
            </div>
            <div className="space-y-1 text-xs text-yellow-600">
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
