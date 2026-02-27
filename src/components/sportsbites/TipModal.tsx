'use client';

import React, { useState, useCallback } from 'react';
import { Coins, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { BaseModal } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';
import { useMedalsBalance, useTransferMedals } from '@/lib/react-query/queries/useMedals';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useModal } from '@/components/modals/ModalProvider';
import { useToast, toast } from '@/components/core/Toast';
import { cn } from '@/lib/utils/client';
import { logger } from '@/lib/logger';

const TIP_PRESETS = [5, 10, 25, 50, 100];

type TipStep = 'select' | 'confirm' | 'success';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  author: string;
  permlink: string;
  senderAccount: string;
}

function formatDisplay(amount: number): string {
  if (Number.isInteger(amount)) return amount.toString();
  return amount.toFixed(3);
}

export function TipModal({ isOpen, onClose, author, permlink, senderAccount }: TipModalProps) {
  const [step, setStep] = useState<TipStep>('select');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const { data: balance } = useMedalsBalance(senderAccount);
  const transferMutation = useTransferMedals();
  const { isCustodial } = useBroadcast();
  const { openModal } = useModal();
  const { addToast } = useToast();

  const liquidBalance = parseFloat(balance?.liquid || '0');
  const amountNum = selectedPreset ?? (parseFloat(customAmount) || 0);
  const isValid = amountNum > 0 && amountNum <= liquidBalance;

  const handlePresetClick = (preset: number) => {
    setSelectedPreset(preset);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
      setCustomAmount(val);
      setSelectedPreset(null);
    }
  };

  const handleConfirm = async () => {
    if (!isValid || transferMutation.isPending) return;

    try {
      const result = await transferMutation.mutateAsync({
        from: senderAccount,
        to: author,
        quantity: amountNum.toFixed(3),
        memo: `Tip on @${author}/${permlink}`,
        action: 'transfer',
      });

      // Record tip + notify (non-blocking)
      fetch('/api/soft/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUsername: senderAccount,
          recipientUsername: author,
          amount: amountNum,
          author,
          permlink,
          txId: result?.transactionId,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            logger.error('Tip record failed', 'TipModal', { status: res.status, ...data });
          }
        })
        .catch((err) => {
          logger.error('Tip record fetch failed', 'TipModal', err);
        });

      setStep('success');
      addToast(
        toast.success('Tip Sent!', `You tipped ${formatDisplay(amountNum)} MEDALS to @${author}`)
      );
    } catch (error) {
      logger.error('Tip failed', 'TipModal', error);
      addToast(
        toast.error('Tip Failed', error instanceof Error ? error.message : 'Something went wrong')
      );
    }
  };

  const handleClose = useCallback(() => {
    setStep('select');
    setCustomAmount('');
    setSelectedPreset(null);
    transferMutation.reset();
    onClose();
  }, [onClose, transferMutation]);

  // Custodial users can't tip — Hive Engine requires active key
  if (isCustodial) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} size="sm" showHeader={false}>
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <Coins className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Connect a Hive Wallet to Tip
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tipping MEDALS requires a Hive wallet like Keychain. Connect your wallet to start
              tipping creators.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                openModal('keychainLogin');
              }}
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 'success' ? undefined : (
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            {step === 'select' ? `Tip @${author}` : 'Confirm Tip'}
          </div>
        )
      }
      size="sm"
      showHeader={step !== 'success'}
    >
      {step === 'select' && (
        <div className="space-y-5">
          {/* Balance */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Your balance</span>
            <span className="font-semibold text-foreground">{liquidBalance.toFixed(3)} MEDALS</span>
          </div>

          {/* Preset amounts */}
          <div className="flex flex-wrap gap-2">
            {TIP_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                disabled={preset > liquidBalance}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-all',
                  selectedPreset === preset
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                    : 'border-border text-muted-foreground hover:border-amber-500/50 hover:text-amber-500',
                  preset > liquidBalance && 'cursor-not-allowed opacity-40'
                )}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Custom amount</label>
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2',
                'bg-background focus-within:border-amber-500'
              )}
            >
              <input
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={handleCustomChange}
                placeholder="0.000"
                className="flex-1 bg-transparent font-mono text-lg text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <span className="text-sm font-medium text-muted-foreground">MEDALS</span>
            </div>
            {amountNum > liquidBalance && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                Insufficient balance
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => setStep('confirm')} disabled={!isValid}>
              Tip {amountNum > 0 ? `${formatDisplay(amountNum)} MEDALS` : ''}
            </Button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">You are tipping</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">
              {formatDisplay(amountNum)} MEDALS
            </p>
            <p className="mt-1 text-sm text-muted-foreground">to @{author}</p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>This transfer is final and recorded on the blockchain.</p>
          </div>

          {/* Error */}
          {transferMutation.error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Tip failed</span>
              </div>
              <p className="mt-1">
                {transferMutation.error instanceof Error
                  ? transferMutation.error.message
                  : 'An error occurred'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep('select')}
              disabled={transferMutation.isPending}
            >
              Back
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={transferMutation.isPending}>
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Confirm Tip'
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-7 w-7 text-success" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Tip Sent!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You tipped {formatDisplay(amountNum)} MEDALS to @{author}
            </p>
          </div>
          <Button size="sm" onClick={handleClose}>
            Done
          </Button>
        </div>
      )}
    </BaseModal>
  );
}
