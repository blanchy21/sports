"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PremiumBadge, PremiumTierProgress, getPremiumTier } from "./PremiumBadge";
import {
  useMedalsBalance,
  useMedalsStake,
  useStakeMedals,
} from "@/lib/react-query/queries/useMedals";
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
} from "lucide-react";

interface StakingPanelProps {
  /** Hive account username */
  account: string;
  /** Callback after successful stake/unstake operation */
  onOperationComplete?: (type: "stake" | "unstake" | "cancelUnstake") => void;
  /** Additional className */
  className?: string;
}

type StakingAction = "stake" | "unstake";

/**
 * Format a token amount to 3 decimal places
 */
function formatAmount(amount: string | number | undefined, precision = 3): string {
  if (!amount) return "0.000";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.000";
  return num.toFixed(precision);
}

/**
 * Format remaining time for unstaking
 */
function formatRemainingTime(ms: number): string {
  if (ms <= 0) return "Ready to claim";

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
  placeholder = "0.000",
  disabled = false,
  error,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, numbers, and one decimal point
    if (val === "" || /^\d*\.?\d{0,3}$/.test(val)) {
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
      <div className={cn(
        "flex items-center gap-2 rounded-lg border bg-white px-3 py-2",
        error ? "border-red-500" : "border-slate-200 focus-within:border-amber-500",
        disabled && "opacity-50 bg-slate-50"
      )}>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 text-lg font-mono bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
        />
        <span className="text-slate-500 font-medium">MEDALS</span>
        {max !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMaxClick}
            disabled={disabled}
            className="text-amber-600 hover:text-amber-700 h-7 px-2"
          >
            MAX
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
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
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      isComplete ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
    )}>
      <div className="flex items-center gap-3">
        <Clock className={cn(
          "h-4 w-4",
          isComplete ? "text-green-600" : "text-amber-600"
        )} />
        <div>
          <span className="font-medium text-slate-900">{formatAmount(quantity)}</span>
          <span className="text-slate-500 ml-1">MEDALS</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-sm",
          isComplete ? "text-green-600 font-medium" : "text-amber-600"
        )}>
          {formatRemainingTime(remainingMs)}
        </span>
        {onCancel && !isComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isCancelling}
            className="h-7 text-red-500 hover:text-red-600 hover:bg-red-50"
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
  const [action, setAction] = useState<StakingAction>("stake");
  const [amount, setAmount] = useState("");
  const [cancellingTx, setCancellingTx] = useState<string | null>(null);

  const {
    data: balance,
    isLoading: balanceLoading,
  } = useMedalsBalance(account);

  const {
    data: stakeInfo,
    isLoading: stakeLoading,
  } = useMedalsStake(account);

  const stakeMutation = useStakeMedals();

  const isLoading = balanceLoading || stakeLoading;

  // Calculate values
  const liquidBalance = parseFloat(balance?.liquid || "0");
  const stakedBalance = parseFloat(balance?.staked || "0");
  const amountNum = parseFloat(amount) || 0;
  const currentTier = getPremiumTier(stakedBalance);

  // Calculate projected tier after operation
  const projectedStaked = action === "stake"
    ? stakedBalance + amountNum
    : stakedBalance - amountNum;
  const projectedTier = getPremiumTier(Math.max(0, projectedStaked));

  // Validation
  const validation = useMemo(() => {
    if (!amount || amountNum <= 0) {
      return { valid: false, error: undefined };
    }

    if (action === "stake") {
      if (amountNum > liquidBalance) {
        return { valid: false, error: "Insufficient liquid balance" };
      }
    } else {
      if (amountNum > stakedBalance) {
        return { valid: false, error: "Insufficient staked balance" };
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
        action: action === "stake" ? "stake" : "unstake",
        quantity: formatAmount(amountNum),
      });

      setAmount("");
      onOperationComplete?.(action);
    } catch (error) {
      console.error("Staking operation failed:", error);
    }
  };

  // Handle cancel unstake
  const handleCancelUnstake = async (transactionId: string) => {
    if (cancellingTx) return;

    setCancellingTx(transactionId);
    try {
      await stakeMutation.mutateAsync({
        account,
        action: "cancelUnstake",
        quantity: "0",
        transactionId,
      });

      onOperationComplete?.("cancelUnstake");
    } catch (error) {
      console.error("Cancel unstake failed:", error);
    } finally {
      setCancellingTx(null);
    }
  };

  // Quick amount buttons
  const quickAmounts = [0.25, 0.5, 0.75, 1].map((pct) => {
    const maxAmount = action === "stake" ? liquidBalance : stakedBalance;
    return {
      label: `${pct * 100}%`,
      value: maxAmount * pct,
    };
  });

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <span className="text-slate-500">Loading staking info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-amber-500" />
          Stake MEDALS
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Balance Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-500">Liquid Balance</span>
            <div className="font-semibold text-slate-900">{formatAmount(liquidBalance)} MEDALS</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <span className="text-xs text-amber-600">Staked Balance</span>
            <div className="font-semibold text-amber-900">{formatAmount(stakedBalance)} MEDALS</div>
          </div>
        </div>

        {/* Premium Tier Progress */}
        <div className="p-4 bg-gradient-to-r from-slate-50 to-amber-50 rounded-lg">
          <PremiumTierProgress currentStaked={stakedBalance} />
        </div>

        {/* Action Tabs */}
        <div className="flex rounded-lg border border-slate-200 p-1">
          <button
            onClick={() => setAction("stake")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors",
              action === "stake"
                ? "bg-amber-500 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Lock className="h-4 w-4" />
            Stake
          </button>
          <button
            onClick={() => setAction("unstake")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors",
              action === "unstake"
                ? "bg-amber-500 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Unlock className="h-4 w-4" />
            Unstake
          </button>
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">
            Amount to {action}
          </label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            max={action === "stake" ? liquidBalance : stakedBalance}
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
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Info className="h-4 w-4" />
              <span>After {action}:</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {currentTier ? (
                <PremiumBadge tier={currentTier} size="sm" />
              ) : (
                <span className="text-sm text-slate-500">No tier</span>
              )}
              <ArrowRight className="h-4 w-4 text-slate-400" />
              {projectedTier ? (
                <PremiumBadge tier={projectedTier} size="sm" />
              ) : (
                <span className="text-sm text-slate-500">No tier</span>
              )}
              <span className="text-sm text-slate-600 ml-auto">
                {formatAmount(projectedStaked)} staked
              </span>
            </div>
          </div>
        )}

        {/* APY Info */}
        {action === "stake" && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            <TrendingUp className="h-4 w-4" />
            <span>Estimated APY: {balance?.estimatedAPY || "~10"}%</span>
          </div>
        )}

        {/* Unstaking Warning */}
        {action === "unstake" && (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Unstaking period:</span>
              <span className="ml-1">
                {stakeInfo?.unstakingCooldown
                  ? `${Math.ceil(stakeInfo.unstakingCooldown / (24 * 60 * 60 * 1000))} days`
                  : "7 days"}
              </span>
              <p className="mt-1 text-xs text-amber-600">
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {action === "stake" ? (
                <Lock className="h-4 w-4 mr-2" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              {action === "stake" ? "Stake" : "Unstake"} {amount || "0"} MEDALS
            </>
          )}
        </Button>

        {/* Mutation Error */}
        {stakeMutation.error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Operation failed</span>
            </div>
            <p className="mt-1">
              {stakeMutation.error instanceof Error
                ? stakeMutation.error.message
                : "An error occurred"}
            </p>
          </div>
        )}

        {/* Pending Unstakes */}
        {stakeInfo?.pendingUnstakeTransactions &&
          stakeInfo.pendingUnstakeTransactions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-700">Pending Unstakes</h4>
                <span className="text-xs text-slate-500">
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
            <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-2">
              <h4 className="font-medium text-slate-700">Delegations</h4>
              {(stakeInfo.delegations.incoming?.length ?? 0) > 0 && (
                <div>
                  <span className="text-slate-500">Received:</span>
                  {stakeInfo.delegations.incoming?.map((d, i) => (
                    <span key={i} className="ml-2 text-green-600">
                      +{formatAmount(d.quantity)} from @{d.from}
                    </span>
                  ))}
                </div>
              )}
              {(stakeInfo.delegations.outgoing?.length ?? 0) > 0 && (
                <div>
                  <span className="text-slate-500">Delegated:</span>
                  {stakeInfo.delegations.outgoing?.map((d, i) => (
                    <span key={i} className="ml-2 text-red-600">
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
