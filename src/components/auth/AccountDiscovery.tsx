import React from 'react';
import { Button } from '@/components/ui/Button';
import { AccountDiscoveryProps } from './types';

export const AccountDiscovery: React.FC<AccountDiscoveryProps> = ({
  discoveredAccounts,
  isConnecting,
  onAccountSelect,
  onDiscover,
}) => {
  return (
    <div className="mt-4 pt-3 border-t border-gray-200">
      <div className="text-center mb-3">
        <h5 className="text-sm font-medium text-gray-700 mb-1">
          Multi-Account Discovery
        </h5>
        <p className="text-xs text-gray-500 mb-2">
          Discover and connect multiple Hive accounts from your wallets
        </p>
        <Button
          onClick={onDiscover}
          disabled={isConnecting}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          {isConnecting ? "Discovering..." : "Discover Accounts"}
        </Button>
      </div>

      {/* Discovered Accounts List */}
      {discoveredAccounts.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          <h6 className="text-xs font-medium text-gray-600 mb-2">
            Found {discoveredAccounts.length} account(s):
          </h6>
          {discoveredAccounts.map((account, index) => (
            <div
              key={index}
              onClick={() => onAccountSelect(account)}
              className="p-2 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {account.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">@{account.username}</div>
                    <div className="text-xs text-gray-500 capitalize">{account.provider}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {account.balance ? `${account.balance} HIVE` : 'Connect'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
