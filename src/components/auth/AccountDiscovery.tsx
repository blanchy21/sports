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
    <div className="mt-4 border-t border-border pt-3">
      <div className="mb-3 text-center">
        <h5 className="mb-1 text-sm font-medium text-foreground/80">Multi-Account Discovery</h5>
        <p className="mb-2 text-xs text-muted-foreground">
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
          <h6 className="mb-2 text-xs font-medium text-foreground/70">
            Found {discoveredAccounts.length} account(s):
          </h6>
          {discoveredAccounts.map((account) => (
            <div
              key={`${account.username}-${account.provider}`}
              onClick={() => onAccountSelect(account)}
              className="cursor-pointer rounded border border-border bg-muted/50 p-2 hover:bg-muted"
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
                    <div className="text-xs capitalize text-muted-foreground">
                      {account.provider}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground/70">
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
