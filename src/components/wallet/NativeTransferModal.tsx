'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils/client';
import { BaseModal, ModalFooter } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';
import { useBroadcast } from '@/lib/hive/broadcast-client';
import { createTransferOperation } from '@/lib/hive-workerbee/shared';
import type { HiveOperation } from '@/types/hive-operations';
import {
  ArrowUpRight,
  User,
  Coins,
  MessageSquare,
  AlertCircle,
  Loader2,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface NativeTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string;
  currency: 'HIVE' | 'HBD';
  balance: number;
  isCustodial: boolean;
  onTransferComplete?: () => void;
}

type TransferStep = 'form' | 'confirm' | 'success';

function formatAmount(amount: string | number | undefined): string {
  if (!amount) return '0.000';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.000';
  return num.toFixed(3);
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  prefix?: string;
}

const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  error,
  icon,
  prefix,
}) => (
  <div className="space-y-1">
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-background px-3 py-2',
        error ? 'border-destructive' : 'border-border focus-within:border-primary',
        disabled && 'bg-muted/50 opacity-50'
      )}
    >
      {icon && <span className="text-muted-foreground/70">{icon}</span>}
      {prefix && <span className="text-muted-foreground">{prefix}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/70"
      />
    </div>
    {error && (
      <p className="flex items-center gap-1 text-sm text-destructive">
        <AlertCircle className="h-3 w-3" />
        {error}
      </p>
    )}
  </div>
);

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  max?: number;
  disabled?: boolean;
  error?: string;
  symbol: string;
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  max,
  disabled,
  error,
  symbol,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-background px-3 py-2',
          error ? 'border-destructive' : 'border-border focus-within:border-primary',
          disabled && 'bg-muted/50 opacity-50'
        )}
      >
        <Coins className="h-4 w-4 text-muted-foreground/70" />
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder="0.000"
          disabled={disabled}
          className="flex-1 bg-transparent font-mono text-lg text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <span className="font-medium text-muted-foreground">{symbol}</span>
        {max !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(formatAmount(max))}
            disabled={disabled}
            className="h-7 px-2 text-primary hover:text-primary/80"
          >
            MAX
          </Button>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

export const NativeTransferModal: React.FC<NativeTransferModalProps> = ({
  isOpen,
  onClose,
  account,
  currency,
  balance,
  isCustodial,
  onTransferComplete,
}) => {
  const [step, setStep] = useState<TransferStep>('form');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const { broadcast } = useBroadcast();
  const amountNum = parseFloat(amount) || 0;

  // Validation
  const validation = useMemo(() => {
    const errors: { recipient?: string; amount?: string } = {};

    if (!recipient.trim()) {
      errors.recipient = 'Recipient is required';
    } else if (recipient.toLowerCase() === account.toLowerCase()) {
      errors.recipient = 'Cannot send to yourself';
    } else if (!/^[a-z][a-z0-9.-]{2,15}$/.test(recipient.toLowerCase())) {
      errors.recipient = 'Invalid Hive username format';
    }

    if (!amount || amountNum <= 0) {
      errors.amount = 'Amount must be greater than 0';
    } else if (amountNum < 0.001) {
      errors.amount = 'Minimum amount is 0.001';
    } else if (amountNum > balance) {
      errors.amount = 'Insufficient balance';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }, [recipient, amount, amountNum, balance, account]);

  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setStep('form');
    setRecipient('');
    setAmount('');
    setMemo('');
    setRecipientError(null);
    setTxError(null);
    setIsPending(false);
    onClose();
  }, [onClose]);

  // Check if recipient account exists before going to confirm
  const handleReview = async () => {
    if (!validation.valid) return;

    setIsCheckingRecipient(true);
    setRecipientError(null);

    try {
      const res = await fetch(`/api/hive/power?account=${recipient.toLowerCase()}`);
      if (!res.ok) {
        setRecipientError('Account does not exist on Hive');
        return;
      }
      const data = await res.json();
      if (!data.success) {
        setRecipientError('Account does not exist on Hive');
        return;
      }
      setStep('confirm');
    } catch {
      setRecipientError('Could not verify account. Please try again.');
    } finally {
      setIsCheckingRecipient(false);
    }
  };

  // Handle confirm step — broadcast the transfer
  const handleConfirm = async () => {
    if (isPending) return;

    setIsPending(true);
    setTxError(null);

    try {
      const transferOp = createTransferOperation({
        from: account,
        to: recipient.toLowerCase(),
        amount: amountNum,
        currency,
        memo: memo.trim() || undefined,
      });

      const operation: HiveOperation = ['transfer', transferOp];
      const result = await broadcast([operation], 'active');

      if (!result.success) {
        setTxError(result.error);
        return;
      }

      setStep('success');
      onTransferComplete?.();
    } catch (error) {
      logger.error('Native transfer failed', 'NativeTransferModal', error);
      setTxError(error instanceof Error ? error.message : 'Transfer failed');
    } finally {
      setIsPending(false);
    }
  };

  // Custodial blocking view
  const renderCustodialBlock = () => (
    <div className="space-y-4 py-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/15">
        <ShieldAlert className="h-8 w-8 text-warning" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Wallet Required</h3>
        <p className="mt-2 text-muted-foreground">
          Sending {currency} requires Hive Keychain or HiveSigner. Managed accounts cannot perform
          native token transfers.
        </p>
      </div>
      <ModalFooter className="justify-center border-t-0 px-0 pb-0 pt-4">
        <Button onClick={handleClose}>Close</Button>
      </ModalFooter>
    </div>
  );

  // Render form step
  const renderFormStep = () => (
    <>
      <div className="space-y-5">
        {/* Balance Display */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">Available Balance</span>
          <span className="font-semibold text-foreground">
            {formatAmount(balance)} {currency}
          </span>
        </div>

        {/* Recipient Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Recipient</label>
          <TextInput
            value={recipient}
            onChange={(val) => {
              setRecipient(val);
              setRecipientError(null);
            }}
            placeholder="username"
            prefix="@"
            icon={<User className="h-4 w-4" />}
            error={recipientError || (recipient ? validation.errors.recipient : undefined)}
          />
          <p className="text-xs text-muted-foreground">Enter the Hive username of the recipient</p>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Amount</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            max={balance}
            error={amount ? validation.errors.amount : undefined}
            symbol={currency}
          />
        </div>

        {/* Memo Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Memo <span className="font-normal text-muted-foreground/70">(optional)</span>
          </label>
          <TextInput
            value={memo}
            onChange={setMemo}
            placeholder="Add a message..."
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <p className="text-xs text-muted-foreground">
            The memo will be visible on the blockchain
          </p>
        </div>
      </div>

      <ModalFooter className="border-t-0 px-0 pb-0 pt-4">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleReview} disabled={!validation.valid || isCheckingRecipient}>
          {isCheckingRecipient ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Review Transfer
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </ModalFooter>
    </>
  );

  // Render confirm step
  const renderConfirmStep = () => (
    <>
      <div className="space-y-5">
        {/* Transfer Summary */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <h4 className="mb-3 text-sm font-medium text-primary">Transfer Summary</h4>

          <div className="flex items-center justify-between py-2">
            <div className="text-center">
              <span className="block text-xs text-muted-foreground">From</span>
              <span className="font-medium text-foreground">@{account}</span>
            </div>
            <ArrowUpRight className="mx-3 h-5 w-5 text-primary" />
            <div className="text-center">
              <span className="block text-xs text-muted-foreground">To</span>
              <span className="font-medium text-foreground">@{recipient}</span>
            </div>
          </div>

          <div className="mt-3 border-t border-primary/20 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-primary">Amount</span>
              <span className="text-lg font-bold text-foreground">
                {formatAmount(amountNum)} {currency}
              </span>
            </div>
          </div>

          {memo && (
            <div className="mt-3 border-t border-primary/20 pt-3">
              <span className="mb-1 block text-xs text-primary">Memo</span>
              <p className="rounded bg-primary/10 p-2 text-sm text-foreground">{memo}</p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
          <p>
            This action cannot be undone. Please verify the recipient address and amount before
            confirming.
          </p>
        </div>

        {/* Error Display */}
        {txError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Transfer failed</span>
            </div>
            <p className="mt-1">{txError}</p>
          </div>
        )}
      </div>

      <ModalFooter className="border-t-0 px-0 pb-0 pt-4">
        <Button variant="outline" onClick={() => setStep('form')} disabled={isPending}>
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Confirm Transfer
            </>
          )}
        </Button>
      </ModalFooter>
    </>
  );

  // Render success step
  const renderSuccessStep = () => (
    <>
      <div className="space-y-4 py-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Transfer Successful!</h3>
          <p className="mt-1 text-muted-foreground">
            You sent {formatAmount(amountNum)} {currency} to @{recipient}
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Amount</span>
            <span className="font-medium text-foreground">
              {formatAmount(amountNum)} {currency}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-muted-foreground">
            <span>Recipient</span>
            <span className="font-medium text-foreground">@{recipient}</span>
          </div>
          {memo && (
            <div className="mt-2 flex items-start justify-between text-muted-foreground">
              <span>Memo</span>
              <span className="max-w-[200px] truncate text-right font-medium text-foreground">
                {memo}
              </span>
            </div>
          )}
        </div>
      </div>

      <ModalFooter className="justify-center border-t-0 px-0 pb-0 pt-4">
        <Button onClick={handleClose}>Close</Button>
      </ModalFooter>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isCustodial || step === 'success' ? undefined : (
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            {step === 'form' ? `Send ${currency}` : 'Confirm Transfer'}
          </div>
        )
      }
      description={
        !isCustodial && step === 'form' ? `Transfer ${currency} to another Hive user` : undefined
      }
      size="md"
      showHeader={!isCustodial && step !== 'success'}
    >
      {isCustodial
        ? renderCustodialBlock()
        : step === 'form'
          ? renderFormStep()
          : step === 'confirm'
            ? renderConfirmStep()
            : renderSuccessStep()}
    </BaseModal>
  );
};

export default NativeTransferModal;
