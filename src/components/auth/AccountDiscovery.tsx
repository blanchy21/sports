import React from 'react';
import { Button } from '@/components/core/Button';
import { AccountDiscoveryProps } from './types';

export const AccountDiscovery: React.FC<AccountDiscoveryProps> = ({
  discoveredAccounts,
  isConnecting,
  onAccountSelect,
  onDiscover,
}) => {
  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <div className="mb-3 text-center">
        <h5 className="mb-1 text-sm font-medium text-gray-700">Multi-Account Discovery</h5>
        <p className="mb-2 text-xs text-gray-500">
          Discover and connect multiple Hive accounts from your wallets
        </p>
        <Button
          onClick={onDiscover}
          disabled={isConnecting}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          {isConnecting ? 'Discovering...' : 'Discover Accounts'}
        </Button>
      </div>

      {/* Discovered Accounts List */}
      {discoveredAccounts.length > 0 && (
        <div className="max-h-40 space-y-2 overflow-y-auto">
          <h6 className="mb-2 text-xs font-medium text-gray-600">
            Found {discoveredAccounts.length} account(s):
          </h6>
          {discoveredAccounts.map((account) => (
            <div
              key={`${account.username}-${account.provider}`}
              onClick={() => onAccountSelect(account)}
              className="cursor-pointer rounded border border-gray-200 bg-gray-50 p-2 hover:bg-gray-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                    <span className="text-xs font-bold text-white">
                      {account.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">@{account.username}</div>
                    <div className="text-xs capitalize text-gray-500">{account.provider}</div>
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
