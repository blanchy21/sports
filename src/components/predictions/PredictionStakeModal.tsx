'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BaseModal } from '@/components/core/BaseModal';
import { Button } from '@/components/core/Button';
import { cn } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaceStake } from '@/hooks/usePredictionStake';
import { useMedalsBalance } from '@/lib/react-query/queries/useMedals';
import { usePredictionStore } from '@/stores/predictionStore';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { Loader2, AlertCircle, Check, TrendingUp } from 'lucide-react';
import type { PredictionBite } from '@/lib/predictions/types';

interface PredictionStakeModalProps {
  prediction: PredictionBite;
  outcomeId: string;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_AMOUNTS = [10, 25, 50, 100] as const;

export function PredictionStakeModal({
  prediction,
  outcomeId,
  isOpen,
  onClose,
}: PredictionStakeModalProps) {
  const { user, hiveUser, authType } = useAuth();
  const placeMutation = usePlaceStake();

  const [amount, setAmount] = useState<number>(PREDICTION_CONFIG.MIN_STAKE);
  const [stakeState, setStakeState] = useState<'idle' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hiveUsername =
    hiveUser?.username || user?.hiveUsername || (authType === 'hive' ? user?.username : undefined);

  const selectedOutcome = useMemo(
    () => prediction.outcomes.find((o) => o.id === outcomeId),
    [prediction.outcomes, outcomeId]
  );

  const existingStake = useMemo(
    () =>
      prediction.userStakes
        ?.filter((s) => s.outcomeId === outcomeId)
        .reduce((sum, s) => sum + s.amount, 0) ?? 0,
    [prediction.userStakes, outcomeId]
  );

  const isTopUp = existingStake > 0;

  const estimatedPayout = useMemo(() => {
    if (!selectedOutcome) return 0;
    return (existingStake + amount) * selectedOutcome.odds;
  }, [amount, existingStake, selectedOutcome]);

  // MEDALS balance via React Query
  const { data: balanceData } = useMedalsBalance(hiveUsername);
  const balance = balanceData ? parseFloat(balanceData.liquid) : null;

  // Track isStaking flag in store based on stakeState
  useEffect(() => {
    usePredictionStore.getState().setIsStaking(stakeState === 'confirming');
  }, [stakeState]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStakeState('idle');
      setErrorMessage(null);
      setAmount(PREDICTION_CONFIG.MIN_STAKE);
    }
  }, [isOpen]);

  const isValidAmount =
    amount >= PREDICTION_CONFIG.MIN_STAKE &&
    amount <= PREDICTION_CONFIG.MAX_STAKE &&
    (balance === null || amount <= balance);

  const handleConfirm = async () => {
    if (!isValidAmount) return;

    setStakeState('confirming');
    setErrorMessage(null);

    try {
      await placeMutation.mutateAsync({
        predictionId: prediction.id,
        outcomeId,
        amount,
      });
      setStakeState('success');
    } catch (err) {
      setStakeState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to place stake');
    }
  };

  if (!selectedOutcome) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isTopUp ? 'Add to Stake' : 'Place Your Stake'}
      size="sm"
    >
      <div className="space-y-5">
        {/* Selected outcome */}
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
          <div className="text-xs text-muted-foreground">You are backing</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-base font-semibold text-warning">{selectedOutcome.label}</span>
            <span className="text-sm font-medium">{selectedOutcome.odds.toFixed(2)}x odds</span>
          </div>
        </div>

        {/* Existing stake banner */}
        {isTopUp && stakeState !== 'success' && (
          <div className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2 text-sm text-info">
            <TrendingUp className="h-4 w-4 shrink-0" />
            Your current stake: {existingStake} MEDALS
          </div>
        )}

        {/* Success state */}
        {stakeState === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
              <Check className="h-6 w-6 text-success" />
            </div>
            <p className="text-center font-semibold text-success">Stake placed successfully!</p>
            <p className="text-center text-sm text-muted-foreground">
              {amount} MEDALS on &quot;{selectedOutcome.label}&quot;
            </p>
            <Button variant="outline" onClick={onClose} className="mt-2">
              Close
            </Button>
          </div>
        )}

        {/* Error state */}
        {stakeState === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setStakeState('idle');
                  setErrorMessage(null);
                }}
                className="flex-1 bg-warning text-white hover:bg-warning/90"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Normal / confirming states */}
        {(stakeState === 'idle' || stakeState === 'confirming') && (
          <>
            {/* Quick stake buttons */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Quick stake
              </label>
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(qa)}
                    className={cn(
                      'flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                      amount === qa
                        ? 'bg-warning text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {qa}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount input */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground">
                Custom amount (MEDALS)
              </label>
              <input
                type="number"
                min={PREDICTION_CONFIG.MIN_STAKE}
                max={PREDICTION_CONFIG.MAX_STAKE}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className={cn(
                  'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none',
                  'focus:ring-2 focus:ring-warning/50',
                  !isValidAmount && amount > 0 && 'border-destructive'
                )}
                disabled={stakeState === 'confirming'}
              />
              {amount > 0 && amount < PREDICTION_CONFIG.MIN_STAKE && (
                <p className="mt-1 text-xs text-destructive">
                  Minimum stake is {PREDICTION_CONFIG.MIN_STAKE} MEDALS
                </p>
              )}
              {amount > PREDICTION_CONFIG.MAX_STAKE && (
                <p className="mt-1 text-xs text-destructive">
                  Maximum stake is {PREDICTION_CONFIG.MAX_STAKE} MEDALS
                </p>
              )}
              {balance !== null && amount > balance && (
                <p className="mt-1 text-xs text-destructive">
                  Insufficient balance ({balance.toFixed(2)} MEDALS available)
                </p>
              )}
            </div>

            {/* Balance display */}
            {balance !== null && (
              <div className="text-xs text-muted-foreground">
                Available balance:{' '}
                <span className="font-medium text-foreground">{balance.toFixed(2)} MEDALS</span>
              </div>
            )}

            {/* Payout preview */}
            {isValidAmount && amount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm">
                  {isTopUp ? (
                    'New total payout'
                  ) : (
                    <>
                      If <span className="font-medium">{selectedOutcome.label}</span> wins
                    </>
                  )}
                  :{' '}
                  <span className="font-semibold text-success">
                    ~{estimatedPayout.toFixed(2)} MEDALS
                  </span>
                </span>
              </div>
            )}

            {/* Confirm button */}
            <Button
              onClick={handleConfirm}
              disabled={!isValidAmount || amount <= 0 || stakeState === 'confirming'}
              className="w-full bg-warning text-white hover:bg-warning/90"
            >
              {stakeState === 'confirming' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                `Stake ${amount} MEDALS`
              )}
            </Button>
          </>
        )}
      </div>
    </BaseModal>
  );
}
