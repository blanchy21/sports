'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils/client';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useSettlePrediction, useVoidPrediction } from '@/hooks/usePredictionSettlement';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { useToast, toast } from '@/components/core/Toast';
import { AlertCircle, Check, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { PredictionBite } from '@/lib/predictions/types';

interface PredictionSettlementPanelProps {
  prediction: PredictionBite;
}

export function PredictionSettlementPanel({ prediction }: PredictionSettlementPanelProps) {
  const { user, hiveUser, authType } = useAuth();
  const { addToast } = useToast();
  const settleMutation = useSettlePrediction();
  const voidMutation = useVoidPrediction();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [confirmingSettle, setConfirmingSettle] = useState(false);
  const [showVoidForm, setShowVoidForm] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [confirmingVoid, setConfirmingVoid] = useState(false);

  const hiveUsername =
    hiveUser?.username || user?.hiveUsername || (authType === 'hive' ? user?.username : undefined);

  const isAdmin = hiveUsername ? PREDICTION_CONFIG.ADMIN_ACCOUNTS.includes(hiveUsername) : false;
  const isCreator = hiveUsername === prediction.creatorUsername;

  // Only render for authorized users on LOCKED predictions
  if (!hiveUsername || (!isCreator && !isAdmin) || prediction.status !== 'LOCKED') {
    return null;
  }

  const isProcessing = settleMutation.isPending || voidMutation.isPending;

  const handleSettle = async () => {
    if (!selectedWinner || !confirmingSettle) return;

    try {
      await settleMutation.mutateAsync({
        predictionId: prediction.id,
        winningOutcomeId: selectedWinner,
      });
      addToast(
        toast.success(
          'Prediction Settled',
          'The winning outcome has been confirmed and payouts initiated.'
        )
      );
      setIsExpanded(false);
      setConfirmingSettle(false);
      setSelectedWinner(null);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleVoid = async () => {
    if (!voidReason.trim() || !confirmingVoid) return;

    try {
      await voidMutation.mutateAsync({
        predictionId: prediction.id,
        reason: voidReason.trim(),
      });
      addToast(toast.success('Prediction Voided', 'All stakes will be refunded.'));
      setIsExpanded(false);
      setConfirmingVoid(false);
      setShowVoidForm(false);
      setVoidReason('');
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-warning transition-colors hover:bg-warning/5"
      >
        <span>Settlement Panel</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="space-y-4 px-4 pb-4">
          {/* Warning */}
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            This action is irreversible
          </div>

          {/* Error display */}
          {(settleMutation.isError || voidMutation.isError) && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {settleMutation.error?.message || voidMutation.error?.message || 'Operation failed'}
              </span>
            </div>
          )}

          {/* Settle section */}
          {!showVoidForm && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Select winning outcome
              </label>
              {prediction.outcomes.map((outcome) => (
                <button
                  key={outcome.id}
                  type="button"
                  onClick={() => {
                    setSelectedWinner(outcome.id);
                    setConfirmingSettle(false);
                  }}
                  disabled={isProcessing}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors',
                    selectedWinner === outcome.id
                      ? 'border-success bg-success/10 text-success'
                      : 'border-border hover:border-success/60 hover:bg-success/5'
                  )}
                >
                  <span>{outcome.label}</span>
                  {selectedWinner === outcome.id && <Check className="h-4 w-4" />}
                </button>
              ))}

              {selectedWinner && !confirmingSettle && (
                <Button
                  onClick={() => setConfirmingSettle(true)}
                  disabled={isProcessing}
                  className="w-full bg-success text-white hover:bg-success/90"
                >
                  Settle Prediction
                </Button>
              )}

              {selectedWinner && confirmingSettle && (
                <div role="alertdialog" aria-label="Confirm settlement" className="space-y-2">
                  <p className="text-center text-sm font-medium text-destructive">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmingSettle(false)}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSettle}
                      disabled={isProcessing}
                      className="flex-1 bg-success text-white hover:bg-success/90"
                    >
                      {settleMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Settling...
                        </>
                      ) : (
                        'Confirm Settlement'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Void section */}
          <div className="border-t pt-3">
            {!showVoidForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVoidForm(true)}
                disabled={isProcessing}
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Void Prediction
              </Button>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Reason for voiding
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Match was cancelled..."
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-destructive/50"
                  rows={2}
                  disabled={isProcessing}
                />

                {!confirmingVoid ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowVoidForm(false);
                        setVoidReason('');
                      }}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setConfirmingVoid(true)}
                      disabled={!voidReason.trim() || isProcessing}
                      className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                    >
                      Void
                    </Button>
                  </div>
                ) : (
                  <div role="alertdialog" aria-label="Confirm void" className="space-y-2">
                    <p className="text-center text-sm font-medium text-destructive">
                      Are you sure? All stakes will be refunded.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmingVoid(false)}
                        disabled={isProcessing}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleVoid}
                        disabled={isProcessing}
                        className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                      >
                        {voidMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Voiding...
                          </>
                        ) : (
                          'Confirm Void'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
