'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils/client';
import { BaseModal, ModalFooter } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';
import { useSwapQuote, useSwapMedals } from '@/lib/react-query/queries/useSwap';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowDownUp,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle,
  ArrowRight,
  Coins,
  Lock,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string;
  liquidHiveBalance: number;
  onSwapComplete?: () => void;
}

type SwapStep = 'form' | 'confirm' | 'success';

function formatHive(amount: number): string {
  return amount.toFixed(3);
}

function formatMedals(amount: number): string {
  return amount.toFixed(3);
}

/**
 * Amount input for HIVE with MAX button
 */
const HiveAmountInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  max: number;
  disabled?: boolean;
  error?: string;
}> = ({ value, onChange, max, disabled, error }) => {
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
          error ? 'border-destructive' : 'border-border focus-within:border-amber-500',
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
        <span className="font-medium text-muted-foreground">HIVE</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(formatHive(max))}
          disabled={disabled}
          className="h-7 px-2 text-warning hover:text-amber-700 dark:hover:text-amber-300"
        >
          MAX
        </Button>
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

/**
 * SwapModal — HIVE → MEDALS swap via Hive Engine order book
 */
export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  account,
  liquidHiveBalance,
  onSwapComplete,
}) => {
  const { authType } = useAuth();
  const [step, setStep] = useState<SwapStep>('form');
  const [amount, setAmount] = useState('');
  const swapMutation = useSwapMedals();

  const amountNum = parseFloat(amount) || 0;

  // Debounced swap quote (only fetches when amount > 0)
  const { data: quote, isLoading: quoteLoading } = useSwapQuote(amountNum > 0 ? amountNum : 0);

  const validation = useMemo(() => {
    const errors: { amount?: string } = {};

    if (!amount || amountNum <= 0) {
      errors.amount = 'Amount must be greater than 0';
    } else if (amountNum > liquidHiveBalance) {
      errors.amount = 'Insufficient HIVE balance';
    } else if (amountNum < 0.001) {
      errors.amount = 'Minimum amount is 0.001 HIVE';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }, [amount, amountNum, liquidHiveBalance]);

  const canProceed = validation.valid && quote?.sufficient && !quoteLoading;

  const handleClose = useCallback(() => {
    setStep('form');
    setAmount('');
    swapMutation.reset();
    onClose();
  }, [onClose, swapMutation]);

  const handleConfirm = async () => {
    if (!quote || !canProceed || swapMutation.isPending) return;

    try {
      await swapMutation.mutateAsync({
        username: account,
        hiveAmount: amountNum,
        fee: quote.fee,
        netHive: quote.netHive,
        estimatedMedals: quote.estimatedMedals,
        worstPrice: quote.worstPrice,
      });

      setStep('success');
      onSwapComplete?.();
    } catch (error) {
      logger.error('Swap failed', 'SwapModal', error);
    }
  };

  // Custodial users can't swap — need Keychain
  if (authType !== 'hive') {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Buy MEDALS
          </div>
        }
        size="md"
      >
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Keychain Required</h3>
            <p className="mt-2 text-muted-foreground">
              Connect with Hive Keychain to swap tokens. Token swaps require signing with your
              active key, which is only available through Hive Keychain.
            </p>
          </div>
        </div>
        <ModalFooter className="justify-center border-t-0 px-0 pb-0 pt-4">
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </BaseModal>
    );
  }

  // ---------- Form Step ----------
  const renderFormStep = () => (
    <>
      <div className="space-y-5">
        {/* Balance Display */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">Available HIVE</span>
          <span className="font-semibold text-foreground">
            {formatHive(liquidHiveBalance)} HIVE
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">HIVE Amount</label>
          <HiveAmountInput
            value={amount}
            onChange={setAmount}
            max={liquidHiveBalance}
            error={amount ? validation.errors.amount : undefined}
          />
        </div>

        {/* Arrow separator */}
        <div className="flex justify-center">
          <div className="rounded-full border bg-muted/50 p-2">
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Estimated Output */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Estimated MEDALS</label>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <Coins className="h-4 w-4 text-warning" />
            <span className="flex-1 font-mono text-lg text-foreground">
              {quoteLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating...
                </span>
              ) : quote && amountNum > 0 ? (
                formatMedals(quote.estimatedMedals)
              ) : (
                <span className="text-muted-foreground/70">0.000</span>
              )}
            </span>
            <span className="font-medium text-warning">MEDALS</span>
          </div>
        </div>

        {/* Quote Details */}
        {quote && amountNum > 0 && (
          <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Rate</span>
              <span>1 MEDALS = {quote.averagePrice.toFixed(6)} HIVE</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Fee (0.5%)</span>
              <span>{formatHive(quote.fee)} HIVE</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Price Impact</span>
              <span
                className={cn(
                  quote.priceImpact > 5
                    ? 'font-medium text-destructive'
                    : quote.priceImpact > 2
                      ? 'font-medium text-warning'
                      : ''
                )}
              >
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Orders Matched</span>
              <span>{quote.ordersMatched}</span>
            </div>
            {!quote.sufficient && (
              <p className="mt-1 flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                Insufficient liquidity — not enough sell orders to fill this amount
              </p>
            )}
          </div>
        )}
      </div>

      <ModalFooter className="border-t-0 px-0 pb-0 pt-4">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={() => setStep('confirm')} disabled={!canProceed}>
          Review Swap
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </ModalFooter>
    </>
  );

  // ---------- Confirm Step ----------
  const renderConfirmStep = () => (
    <>
      <div className="space-y-5">
        {/* Swap Summary */}
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <h4 className="mb-3 text-sm font-medium text-amber-800 dark:text-amber-300">
            Swap Summary
          </h4>

          <div className="flex items-center justify-between py-2">
            <div className="text-center">
              <span className="block text-xs text-muted-foreground">You Pay</span>
              <span className="text-lg font-bold text-foreground">
                {formatHive(amountNum)} HIVE
              </span>
            </div>
            <ArrowDownUp className="mx-3 h-5 w-5 text-amber-500" />
            <div className="text-center">
              <span className="block text-xs text-muted-foreground">You Receive (est.)</span>
              <span className="text-lg font-bold text-warning">
                {quote ? formatMedals(quote.estimatedMedals) : '0'} MEDALS
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2 border-t border-amber-200 pt-3 text-sm dark:border-amber-800">
            <div className="flex items-center justify-between">
              <span className="text-amber-700 dark:text-amber-400">Rate</span>
              <span className="text-amber-900 dark:text-amber-200">
                1 MEDALS = {quote ? quote.averagePrice.toFixed(6) : '–'} HIVE
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-700 dark:text-amber-400">Fee (0.5%)</span>
              <span className="text-amber-900 dark:text-amber-200">
                {quote ? formatHive(quote.fee) : '–'} HIVE
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-700 dark:text-amber-400">Price Impact</span>
              <span className="text-amber-900 dark:text-amber-200">
                {quote ? quote.priceImpact.toFixed(2) : '0'}%
              </span>
            </div>
          </div>
        </div>

        {/* Price Impact Warning */}
        {quote && quote.priceImpact > 2 && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              {quote.priceImpact > 5
                ? 'High price impact! You may receive significantly fewer MEDALS than expected. Consider swapping a smaller amount.'
                : 'Moderate price impact. The order book is thin at this size — you may want to swap in smaller batches.'}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
          <p>
            This will send a 0.5% fee, deposit HIVE to Hive Engine, and place a market buy order for
            MEDALS. Keychain will prompt you to sign three operations in one transaction.
          </p>
        </div>

        {/* Error Display */}
        {swapMutation.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Swap failed</span>
            </div>
            <p className="mt-1">
              {swapMutation.error instanceof Error
                ? swapMutation.error.message
                : 'An error occurred'}
            </p>
          </div>
        )}
      </div>

      <ModalFooter className="border-t-0 px-0 pb-0 pt-4">
        <Button variant="outline" onClick={() => setStep('form')} disabled={swapMutation.isPending}>
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={swapMutation.isPending}>
          {swapMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowDownUp className="mr-2 h-4 w-4" />
              Confirm Swap
            </>
          )}
        </Button>
      </ModalFooter>
    </>
  );

  // ---------- Success Step ----------
  const renderSuccessStep = () => (
    <>
      <div className="space-y-4 py-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Swap Successful!</h3>
          <p className="mt-1 text-muted-foreground">
            You swapped {formatHive(amountNum)} HIVE for ~
            {quote ? formatMedals(quote.estimatedMedals) : '–'} MEDALS
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>HIVE Spent</span>
            <span className="font-medium text-foreground">{formatHive(amountNum)} HIVE</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-muted-foreground">
            <span>Fee (0.5%)</span>
            <span className="font-medium text-foreground">
              {quote ? formatHive(quote.fee) : '–'} HIVE
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-muted-foreground">
            <span>MEDALS Received (est.)</span>
            <span className="font-medium text-warning">
              {quote ? formatMedals(quote.estimatedMedals) : '–'} MEDALS
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-muted-foreground">
            <span>Avg. Price</span>
            <span className="font-medium text-foreground">
              {quote ? quote.averagePrice.toFixed(6) : '–'} HIVE
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Your MEDALS balance will update after the Hive Engine sidechain processes the transaction
          (usually within 1–2 minutes).
        </p>
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
        step === 'success' ? undefined : (
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-amber-500" />
            {step === 'form' ? 'Buy MEDALS' : 'Confirm Swap'}
          </div>
        )
      }
      description={
        step === 'form' ? 'Swap HIVE for MEDALS via the Hive Engine order book' : undefined
      }
      size="md"
      showHeader={step !== 'success'}
    >
      {step === 'form' && renderFormStep()}
      {step === 'confirm' && renderConfirmStep()}
      {step === 'success' && renderSuccessStep()}
    </BaseModal>
  );
};

export default SwapModal;
