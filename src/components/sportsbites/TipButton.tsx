'use client';

import React, { useState } from 'react';
import { Coins } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/components/modals/ModalProvider';
import { TipModal } from './TipModal';
import { cn } from '@/lib/utils/client';

interface TipButtonProps {
  author: string;
  permlink: string;
  className?: string;
}

export function TipButton({ author, permlink, className }: TipButtonProps) {
  const [showTipModal, setShowTipModal] = useState(false);
  const { isAuthenticated, authType, hiveUser, user } = useAuth();
  const { openModal } = useModal();

  const senderAccount = authType === 'hive' ? hiveUser?.username : user?.username;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openModal('keychainLogin');
      return;
    }
    setShowTipModal(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={cn(
          'flex h-8 items-center gap-1.5 px-2 text-muted-foreground',
          'transition-all hover:bg-amber-500/10 hover:text-amber-500',
          className
        )}
        title="Tip MEDALS"
      >
        <Coins className="h-4 w-4" />
      </Button>
      {showTipModal && senderAccount && (
        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          author={author}
          permlink={permlink}
          senderAccount={senderAccount}
        />
      )}
    </>
  );
}
