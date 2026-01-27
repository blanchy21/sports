'use client';

import React from 'react';
import { Button } from '@/components/core/Button';
import { Wallet, X } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { useModal } from '@/components/modals/ModalProvider';

interface HiveUpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string; // e.g., "vote on", "comment on"
  className?: string;
}

export const HiveUpgradePrompt: React.FC<HiveUpgradePromptProps> = ({
  isOpen,
  onClose,
  action = 'interact with',
  className,
}) => {
  const { openModal } = useModal();

  if (!isOpen) return null;

  const handleConnectWallet = () => {
    onClose();
    openModal('keychainLogin');
  };

  return (
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/50', className)}
    >
      <div className="relative mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-8 w-8 text-primary" />
          </div>

          <h3 className="mb-2 text-xl font-semibold">Connect Hive Wallet</h3>

          <p className="mb-6 text-muted-foreground">
            To {action} this Hive post, you need to connect a Hive wallet. Hive posts are stored on
            the blockchain and require a wallet for interactions.
          </p>

          <div className="space-y-3">
            <Button className="w-full" onClick={handleConnectWallet}>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Hive Wallet
            </Button>

            <Button variant="outline" className="w-full" onClick={onClose}>
              Maybe Later
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Connecting a Hive wallet unlocks rewards, voting power, and full platform access.
          </p>
        </div>
      </div>
    </div>
  );
};

// Hook for managing the upgrade prompt state
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useHiveUpgradePrompt = () => {
  const { isAuthenticated, authType } = useAuth();
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptAction, setPromptAction] = useState<string>('interact with');

  const showPromptIfNeeded = useCallback(
    (action: string = 'interact with'): boolean => {
      // If user is authenticated but not with Hive, show prompt
      if (isAuthenticated && authType !== 'hive') {
        setPromptAction(action);
        setIsPromptOpen(true);
        return true; // Prompt was shown
      }
      return false; // No prompt needed
    },
    [isAuthenticated, authType]
  );

  const closePrompt = useCallback(() => {
    setIsPromptOpen(false);
  }, []);

  return {
    isPromptOpen,
    promptAction,
    showPromptIfNeeded,
    closePrompt,
  };
};
