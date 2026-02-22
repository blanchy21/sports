'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BaseModal } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';

const WALLET_PROVIDERS = [
  {
    id: 'keychain',
    name: 'Hive Keychain',
    description: 'Browser extension',
    logo: '/hive-keychain-logo.svg',
    requiresUsername: true,
  },
  {
    id: 'hivesigner',
    name: 'HiveSigner',
    description: 'Web wallet',
    logo: '/hivesigner-icon.png',
    requiresUsername: false,
  },
] as const;

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderSelect: (provider: string) => void;
  isConnecting: boolean;
  showUsernameInput: boolean;
  selectedProvider: string | null;
  hiveUsername: string;
  onUsernameChange: (value: string) => void;
  onUsernameSubmit: () => void;
  onUsernameCancel: () => void;
}

export const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
  onProviderSelect,
  isConnecting,
  showUsernameInput,
  selectedProvider,
  hiveUsername,
  onUsernameChange,
  onUsernameSubmit,
  onUsernameCancel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedConfig = WALLET_PROVIDERS.find((p) => p.id === selectedProvider);

  useEffect(() => {
    if (showUsernameInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showUsernameInput]);

  const handleClose = () => {
    onUsernameCancel();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hiveUsername.trim()) {
      onUsernameSubmit();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="lg" showHeader={false}>
      {showUsernameInput && selectedConfig ? (
        /* Username input view */
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onUsernameCancel}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back to wallet selection"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">
              Connect with {selectedConfig.name}
            </h2>
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Image
                src={selectedConfig.logo}
                alt={selectedConfig.name}
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground">Enter your Hive username to connect</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                @
              </span>
              <input
                ref={inputRef}
                type="text"
                value={hiveUsername}
                onChange={(e) => onUsernameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="username"
                disabled={isConnecting}
                className="h-12 w-full rounded-xl border border-border bg-background pl-8 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
            </div>

            <Button
              onClick={onUsernameSubmit}
              disabled={isConnecting || !hiveUsername.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* Wallet grid view */
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Connect Hive Wallet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose your preferred wallet to connect
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {WALLET_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => onProviderSelect(provider.id)}
                disabled={isConnecting}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:p-6"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/50 transition-colors group-hover:bg-primary/10 sm:h-16 sm:w-16">
                  <Image
                    src={provider.logo}
                    alt={provider.name}
                    width={36}
                    height={36}
                    className="object-contain sm:h-10 sm:w-10"
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground">{provider.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{provider.description}</div>
                </div>
              </button>
            ))}
          </div>

          {isConnecting && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Connecting...</span>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
};
