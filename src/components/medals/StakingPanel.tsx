'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/core/Card';
import { Button } from '@/components/core/Button';
import { PremiumBadge, PremiumTierProgress, getPremiumTier } from './PremiumBadge';
import {
  useMedalsBalance,
  useMedalsStake,
  useStakeMedals,
} from '@/lib/react-query/queries/useMedals';
import {
  Lock,
  Unlock,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface StakingPanelProps {
  /** Hive account username */
  account: string;
  /** Callback after successful stake/unstake operation */
  onOperationComplete?: (type: 'stake' | 'unstake' | 'cancelUnstake') => void;
  /** Additional className */
  className?: string;
}

type StakingAction = 'stake' | 'unstake';

/**
 * Format a token amount to 3 decimal places
 */
function formatAmount(amount: string | number | undefined, precision = 3): string {
  if (!amount) return '0.000';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.000';
  return num.toFixed(precision);
}

/**
 * Format remaining time for unstaking
 */
function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'Ready to claim';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Custom input component for amount
 */
interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  max,
  placeholder = '0.000',
  disabled = false,
  error,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, numbers, and one decimal point
    if (val === '' || /^\d*\.?\d{0,3}$/.test(val)) {
      onChange(val);
    }
  };

  const handleMaxClick = () => {
    if (max !== undefined) {
      onChange(formatAmount(max));
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
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent font-mono text-lg text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <span className="font-medium text-muted-foreground">MEDALS</span>
        {max !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMaxClick}
            disabled={disabled}
            className="h-7 px-2 text-warning hover:text-amber-700 dark:hover:text-amber-300"
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

/**
 * Pending unstake item component
 */
interface PendingUnstakeItemProps {
  quantity: string;
  remainingMs: number;
  completeTimestamp: string;
  onCancel?: () => void;
  isCancelling?: boolean;
}

const PendingUnstakeItem: React.FC<PendingUnstakeItemProps> = ({
  quantity,
  remainingMs,
  onCancel,
  isCancelling,
}) => {
  const isComplete = remainingMs <= 0;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-3',
        isComplete ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'
      )}
    >
      <div className="flex items-center gap-3">
        <Clock className={cn('h-4 w-4', isComplete ? 'text-success' : 'text-warning')} />
        <div>
          <span className="font-medium text-foreground">{formatAmount(quantity)}</span>
          <span className="ml-1 text-muted-foreground">MEDALS</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm', isComplete ? 'font-medium text-success' : 'text-warning')}>
          {formatRemainingTime(remainingMs)}
        </span>
        {onCancel && !isComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
            className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {isCancelling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * StakingPanel component for staking/unstaking MEDALS
 */
export const StakingPanel: React.FC<StakingPanelProps> = ({
  account,
  onOperationComplete,
  className,
}) => {
  const [action, setAction] = useState<StakingAction>('stake');
  const [amount, setAmount] = useState('');
  const [cancellingTx, setCancellingTx] = useState<string | null>(null);

  const { data: balance, isLoading: balanceLoading } = useMedalsBalance(account);

  const { data: stakeInfo, isLoading: stakeLoading } = useMedalsStake(account);

  const stakeMutation = useStakeMedals();

  const isLoading = balanceLoading || stakeLoading;

  // Calculate values
  const liquidBalance = parseFloat(balance?.liquid || '0');
  const stakedBalance = parseFloat(balance?.staked || '0');
  const amountNum = parseFloat(amount) || 0;
  const currentTier = getPremiumTier(stakedBalance);

  // Calculate projected tier after operation
  const projectedStaked =
    action === 'stake' ? stakedBalance + amountNum : stakedBalance - amountNum;
  const projectedTier = getPremiumTier(Math.max(0, projectedStaked));

  // Validation
  const validation = useMemo(() => {
    if (!amount || amountNum <= 0) {
      return { valid: false, error: undefined };
    }

    if (action === 'stake') {
      if (amountNum > liquidBalance) {
        return { valid: false, error: 'Insufficient liquid balance' };
      }
    } else {
      if (amountNum > stakedBalance) {
        return { valid: false, error: 'Insufficient staked balance' };
      }
    }

    return { valid: true, error: undefined };
  }, [amount, amountNum, action, liquidBalance, stakedBalance]);

  // Handle stake/unstake
  const handleSubmit = async () => {
    if (!validation.valid || stakeMutation.isPending) return;

    try {
      await stakeMutation.mutateAsync({
        account,
        action: action === 'stake' ? 'stake' : 'unstake',
        quantity: formatAmount(amountNum),
      });

      setAmount('');
      onOperationComplete?.(action);
    } catch (error) {
      logger.error('Staking operation failed', 'StakingPanel', error);
    }
  };

  // Handle cancel unstake
  const handleCancelUnstake = async (transactionId: string) => {
    if (cancellingTx) return;

    setCancellingTx(transactionId);
    try {
      await stakeMutation.mutateAsync({
        account,
        action: 'cancelUnstake',
        quantity: '0',
        transactionId,
      });

      onOperationComplete?.('cancelUnstake');
    } catch (error) {
      logger.error('Cancel unstake failed', 'StakingPanel', error);
    } finally {
      setCancellingTx(null);
    }
  };

  // Quick amount buttons
  const quickAmounts = [0.25, 0.5, 0.75, 1].map((pct) => {
    const maxAmount = action === 'stake' ? liquidBalance : stakedBalance;
    return {
      label: `${pct * 100}%`,
      value: maxAmount * pct,
    };
  });

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <span className="text-muted-foreground">Loading staking info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-amber-500" />
          Stake MEDALS
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Balance Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-xs text-muted-foreground">Liquid Balance</span>
            <div className="font-semibold text-foreground">
              {formatAmount(liquidBalance)} MEDALS
            </div>
          </div>
          <div className="rounded-lg bg-warning/10 p-3">
            <span className="text-xs text-warning">Staked Balance</span>
            <div className="font-semibold text-amber-900 dark:text-amber-200">
              {formatAmount(stakedBalance)} MEDALS
            </div>
          </div>
        </div>

        {/* Premium Tier Progress */}
        <div className="rounded-lg bg-gradient-to-r from-slate-50 to-amber-50 p-4 dark:from-slate-800 dark:to-amber-900/20">
          <PremiumTierProgress currentStaked={stakedBalance} />
        </div>

        {/* Action Tabs */}
        <div className="flex rounded-lg border border-border p-1">
          <button
            onClick={() => setAction('stake')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              action === 'stake'
                ? 'bg-amber-500 text-white'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Lock className="h-4 w-4" />
            Stake
          </button>
          <button
            onClick={() => setAction('unstake')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              action === 'unstake'
                ? 'bg-amber-500 text-white'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Unlock className="h-4 w-4" />
            Unstake
          </button>
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground/80">Amount to {action}</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            max={action === 'stake' ? liquidBalance : stakedBalance}
            error={validation.error}
            disabled={stakeMutation.isPending}
          />

          {/* Quick amount buttons */}
          <div className="flex gap-2">
            {quickAmounts.map(({ label, value }) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                onClick={() => setAmount(formatAmount(value))}
                disabled={stakeMutation.isPending || value === 0}
                className="flex-1 text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tier Change Preview */}
        {amountNum > 0 && validation.valid && (
          <div className="rounded-lg border border-info/30 bg-info/10 p-3">
            <div className="flex items-center gap-2 text-sm text-info">
              <Info className="h-4 w-4" />
              <span>After {action}:</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              {currentTier ? (
                <PremiumBadge tier={currentTier} size="sm" />
              ) : (
                <span className="text-sm text-muted-foreground">No tier</span>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground/70" />
              {projectedTier ? (
                <PremiumBadge tier={projectedTier} size="sm" />
              ) : (
                <span className="text-sm text-muted-foreground">No tier</span>
              )}
              <span className="ml-auto text-sm text-muted-foreground">
                {formatAmount(projectedStaked)} staked
              </span>
            </div>
          </div>
        )}

        {/* APY Info */}
        {action === 'stake' && (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <TrendingUp className="h-4 w-4" />
            <span>Estimated APY: {balance?.estimatedAPY || '~10'}%</span>
          </div>
        )}

        {/* Unstaking Warning */}
        {action === 'unstake' && (
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <span className="font-medium">Unstaking period:</span>
              <span className="ml-1">
                {stakeInfo?.unstakingCooldown
                  ? `${Math.ceil(stakeInfo.unstakingCooldown / (24 * 60 * 60 * 1000))} days`
                  : '7 days'}
              </span>
              <p className="mt-1 text-xs text-warning">
                Unstaked tokens will be locked and gradually released.
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!validation.valid || stakeMutation.isPending}
          className="w-full"
        >
          {stakeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {action === 'stake' ? (
                <Lock className="mr-2 h-4 w-4" />
              ) : (
                <Unlock className="mr-2 h-4 w-4" />
              )}
              {action === 'stake' ? 'Stake' : 'Unstake'} {amount || '0'} MEDALS
            </>
          )}
        </Button>

        {/* Mutation Error */}
        {stakeMutation.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Operation failed</span>
            </div>
            <p className="mt-1">
              {stakeMutation.error instanceof Error
                ? stakeMutation.error.message
                : 'An error occurred'}
            </p>
          </div>
        )}

        {/* Pending Unstakes */}
        {stakeInfo?.pendingUnstakeTransactions &&
          stakeInfo.pendingUnstakeTransactions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground/80">Pending Unstakes</h4>
                <span className="text-xs text-muted-foreground">
                  {stakeInfo.pendingUnstakeTransactions.length} pending
                </span>
              </div>
              <div className="space-y-2">
                {stakeInfo.pendingUnstakeTransactions.map((tx, index) => (
                  <PendingUnstakeItem
                    key={`${tx.completeTimestamp}-${index}`}
                    quantity={tx.quantity}
                    remainingMs={tx.remainingMs}
                    completeTimestamp={tx.completeTimestamp}
                    onCancel={() => handleCancelUnstake(`${tx.completeTimestamp}-${index}`)}
                    isCancelling={cancellingTx === `${tx.completeTimestamp}-${index}`}
                  />
                ))}
              </div>
            </div>
          )}

        {/* Delegations Info */}
        {stakeInfo?.delegations &&
          ((stakeInfo.delegations.incoming?.length ?? 0) > 0 ||
            (stakeInfo.delegations.outgoing?.length ?? 0) > 0) && (
            <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
              <h4 className="font-medium text-foreground/80">Delegations</h4>
              {(stakeInfo.delegations.incoming?.length ?? 0) > 0 && (
                <div>
                  <span className="text-muted-foreground">Received:</span>
                  {stakeInfo.delegations.incoming?.map((d, i) => (
                    <span key={i} className="ml-2 text-success">
                      +{formatAmount(d.quantity)} from @{d.from}
                    </span>
                  ))}
                </div>
              )}
              {(stakeInfo.delegations.outgoing?.length ?? 0) > 0 && (
                <div>
                  <span className="text-muted-foreground">Delegated:</span>
                  {stakeInfo.delegations.outgoing?.map((d, i) => (
                    <span key={i} className="ml-2 text-destructive">
                      -{formatAmount(d.quantity)} to @{d.to}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default StakingPanel;
