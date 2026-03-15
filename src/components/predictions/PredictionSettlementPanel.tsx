'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils/client';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSettlePrediction,
  useVoidPrediction,
  useApprovePrediction,
  useRejectPrediction,
} from '@/hooks/usePredictionSettlement';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { useToast, toast } from '@/components/core/Toast';
import {
  AlertCircle,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { PredictionBite } from '@/lib/predictions/types';

interface PredictionSettlementPanelProps {
  prediction: PredictionBite;
}

export function PredictionSettlementPanel({ prediction }: PredictionSettlementPanelProps) {
  const { user, hiveUser, authType } = useAuth();
  const { addToast } = useToast();
  const settleMutation = useSettlePrediction();
  const voidMutation = useVoidPrediction();
  const approveMutation = useApprovePrediction();
  const rejectMutation = useRejectPrediction();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [confirmingSettle, setConfirmingSettle] = useState(false);
  const [showVoidForm, setShowVoidForm] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [confirmingRetry, setConfirmingRetry] = useState(false);

  const hiveUsername =
    hiveUser?.username || user?.hiveUsername || (authType === 'hive' ? user?.username : undefined);

  const isAdmin = hiveUsername ? PREDICTION_CONFIG.ADMIN_ACCOUNTS.includes(hiveUsername) : false;
  const isCreator = hiveUsername === prediction.creatorUsername;
  const isProposer = hiveUsername === prediction.proposedBy;

  // Show panel for LOCKED (creators/admins can propose), PENDING_APPROVAL (admins can approve/reject),
  // or SETTLING (admins can retry a stuck settlement)
  const showForLocked = (isCreator || isAdmin) && prediction.status === 'LOCKED';
  const showForPending = isAdmin && prediction.status === 'PENDING_APPROVAL';
  const showForSettling = isAdmin && prediction.status === 'SETTLING';

  if (!hiveUsername || (!showForLocked && !showForPending && !showForSettling)) {
    return null;
  }

  const isProcessing =
    settleMutation.isPending ||
    voidMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending;

  const handleSettle = async () => {
    if (!selectedWinner || !confirmingSettle) return;

    try {
      await settleMutation.mutateAsync({
        predictionId: prediction.id,
        winningOutcomeId: selectedWinner,
      });
      addToast(toast.success('Settlement Proposed', 'Awaiting approval from another admin.'));
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
      addToast(toast.success('Void Proposed', 'Awaiting approval from another admin.'));
      setIsExpanded(false);
      setConfirmingVoid(false);
      setShowVoidForm(false);
      setVoidReason('');
    } catch {
      // Error handled by mutation state
    }
  };

  const handleApprove = async () => {
    if (!confirmingApprove) return;

    try {
      await approveMutation.mutateAsync({ predictionId: prediction.id });
      const action = prediction.proposedAction === 'settle' ? 'settled' : 'voided';
      addToast(toast.success('Proposal Approved', `Prediction ${action} successfully.`));
      setIsExpanded(false);
      setConfirmingApprove(false);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleReject = async () => {
    if (!confirmingReject) return;

    try {
      await rejectMutation.mutateAsync({ predictionId: prediction.id });
      addToast(toast.success('Proposal Rejected', 'Prediction returned to LOCKED status.'));
      setIsExpanded(false);
      setConfirmingReject(false);
    } catch {
      // Error handled by mutation state
    }
  };

  const anyError =
    settleMutation.isError ||
    voidMutation.isError ||
    approveMutation.isError ||
    rejectMutation.isError;
  const errorMessage =
    settleMutation.error?.message ||
    voidMutation.error?.message ||
    approveMutation.error?.message ||
    rejectMutation.error?.message ||
    'Operation failed';

  const handleRetry = async () => {
    if (!confirmingRetry) return;

    try {
      await approveMutation.mutateAsync({ predictionId: prediction.id });
      addToast(toast.success('Settlement Retried', 'Prediction settled successfully.'));
      setIsExpanded(false);
      setConfirmingRetry(false);
    } catch {
      // Error handled by mutation state
    }
  };

  const panelLabel =
    prediction.status === 'SETTLING'
      ? 'Settlement Stuck — Retry'
      : prediction.status === 'PENDING_APPROVAL'
        ? 'Approval Panel'
        : 'Settlement Panel';

  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors',
          prediction.status === 'SETTLING'
            ? 'text-destructive hover:bg-destructive/5'
            : prediction.status === 'PENDING_APPROVAL'
              ? 'text-amber-600 hover:bg-amber-500/5'
              : 'text-warning hover:bg-warning/5'
        )}
      >
        <span className="flex items-center gap-2">
          {prediction.status === 'PENDING_APPROVAL' && <ShieldCheck className="h-4 w-4" />}
          {panelLabel}
        </span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="space-y-4 px-4 pb-4">
          {/* Error display */}
          {anyError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* === PENDING_APPROVAL mode: show proposal info + approve/reject === */}
          {prediction.status === 'PENDING_APPROVAL' && (
            <div className="space-y-3">
              {/* Proposal info */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-sm">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Pending Approval</span>
                </div>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Proposed by:</span> @
                    {prediction.proposedBy}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Action:</span>{' '}
                    {prediction.proposedAction === 'settle' ? (
                      <>
                        Settle — Winner:{' '}
                        <span className="font-semibold text-success">
                          {prediction.outcomes.find((o) => o.id === prediction.proposedOutcomeId)
                            ?.label ?? 'Unknown'}
                        </span>
                      </>
                    ) : (
                      <>
                        Void — Reason:{' '}
                        <span className="italic">{prediction.proposedVoidReason}</span>
                      </>
                    )}
                  </p>
                  {prediction.proposedAt && (
                    <p className="text-xs">
                      Proposed {new Date(prediction.proposedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Approve/Reject buttons — only for a DIFFERENT admin */}
              {isProposer ? (
                <div className="rounded-lg bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
                  Waiting for another admin to approve or reject your proposal.
                </div>
              ) : (
                <div className="space-y-2">
                  {!confirmingApprove && !confirmingReject && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setConfirmingApprove(true)}
                        disabled={isProcessing}
                        className="flex-1 bg-success text-white hover:bg-success/90"
                      >
                        <Check className="mr-1.5 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setConfirmingReject(true)}
                        disabled={isProcessing}
                        className="flex-1 text-destructive hover:bg-destructive/10"
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {confirmingApprove && (
                    <div role="alertdialog" aria-label="Confirm approval" className="space-y-2">
                      <p className="text-center text-sm font-medium text-destructive">
                        This will execute the {prediction.proposedAction}. Are you sure?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmingApprove(false)}
                          disabled={isProcessing}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleApprove}
                          disabled={isProcessing}
                          className="flex-1 bg-success text-white hover:bg-success/90"
                        >
                          {approveMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            'Confirm Approval'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {confirmingReject && (
                    <div role="alertdialog" aria-label="Confirm rejection" className="space-y-2">
                      <p className="text-center text-sm font-medium text-warning">
                        This will return the prediction to LOCKED status.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setConfirmingReject(false)}
                          disabled={isProcessing}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleReject}
                          disabled={isProcessing}
                          className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                        >
                          {rejectMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Rejecting...
                            </>
                          ) : (
                            'Confirm Rejection'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* === SETTLING mode: retry stuck settlement === */}
          {prediction.status === 'SETTLING' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Settlement Stuck</span>
                </div>
                <p className="mt-2 text-muted-foreground">
                  A previous settlement attempt failed mid-broadcast. Some payouts may already be
                  sent. Retrying will skip completed steps and finish the settlement.
                </p>
              </div>

              {!confirmingRetry ? (
                <Button
                  onClick={() => setConfirmingRetry(true)}
                  disabled={isProcessing}
                  className="w-full bg-warning text-white hover:bg-warning/90"
                >
                  Retry Settlement
                </Button>
              ) : (
                <div role="alertdialog" aria-label="Confirm settlement retry" className="space-y-2">
                  <p className="text-center text-sm font-medium text-warning">
                    This will resume the stuck settlement. Already-sent payouts will be skipped.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setConfirmingRetry(false)}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRetry}
                      disabled={isProcessing}
                      className="flex-1 bg-warning text-white hover:bg-warning/90"
                    >
                      {approveMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        'Confirm Retry'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === LOCKED mode: propose settlement or void === */}
          {prediction.status === 'LOCKED' && (
            <>
              {/* Warning */}
              <div className="flex items-center gap-2 rounded-lg bg-info/10 px-3 py-2 text-xs text-info">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Proposals require approval from a second admin before execution
              </div>

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
                      Propose Settlement
                    </Button>
                  )}

                  {selectedWinner && confirmingSettle && (
                    <div
                      role="alertdialog"
                      aria-label="Confirm settlement proposal"
                      className="space-y-2"
                    >
                      <p className="text-center text-sm font-medium text-warning">
                        A second admin will need to approve this before execution.
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
                              Proposing...
                            </>
                          ) : (
                            'Confirm Proposal'
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
                    Propose Void
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
                          Propose Void
                        </Button>
                      </div>
                    ) : (
                      <div
                        role="alertdialog"
                        aria-label="Confirm void proposal"
                        className="space-y-2"
                      >
                        <p className="text-center text-sm font-medium text-warning">
                          A second admin will need to approve this before execution.
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
                                Proposing...
                              </>
                            ) : (
                              'Confirm Void Proposal'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
