'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/core/Card';
import { Button } from '@/components/core/Button';
import {
  useHivePowerInfo,
  useHivePowerMutation,
  formatNextWithdrawal,
  calculateWeeklyPowerDown,
} from '@/lib/react-query/queries/useHivePower';
import {
  Zap,
  TrendingDown,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface PowerPanelProps {
  /** Hive account username */
  account: string;
  /** Current liquid HIVE balance */
  liquidHive?: number;
  /** Callback after successful operation */
  onOperationComplete?: (type: 'powerUp' | 'powerDown' | 'cancelPowerDown') => void;
  /** Additional className */
  className?: string;
}

type PowerAction = 'powerUp' | 'powerDown';

/**
 * Format a HIVE amount to 3 decimal places
 */
function formatAmount(amount: string | number | undefined, precision = 3): string {
  if (!amount) return '0.000';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.000';
  return num.toFixed(precision);
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
  symbol?: string;
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  max,
  placeholder = '0.000',
  disabled = false,
  error,
  symbol = 'HIVE',
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
          'flex items-center gap-2 rounded-lg border bg-card px-3 py-2',
          error ? 'border-destructive' : 'border-border focus-within:border-accent',
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
        <span className="font-medium text-muted-foreground">{symbol}</span>
        {max !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMaxClick}
            disabled={disabled}
            className="h-7 px-2 text-accent hover:text-accent/80"
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
 * PowerPanel component for Power Up/Down HIVE
 */
export const PowerPanel: React.FC<PowerPanelProps> = ({
  account,
  liquidHive,
  onOperationComplete,
  className,
}) => {
  const [action, setAction] = useState<PowerAction>('powerUp');
  const [amount, setAmount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: powerInfo, isLoading: infoLoading } = useHivePowerInfo(account);
  const powerMutation = useHivePowerMutation();

  const isLoading = infoLoading;

  // Calculate values
  const liquidBalance = liquidHive ?? parseFloat(powerInfo?.liquidHive || '0');
  const hivePower = parseFloat(powerInfo?.hivePower || '0');
  const effectiveHivePower = parseFloat(powerInfo?.effectiveHivePower || '0');
  const delegatedOut = parseFloat(powerInfo?.delegatedOut || '0');
  const delegatedIn = parseFloat(powerInfo?.delegatedIn || '0');
  const amountNum = parseFloat(amount) || 0;
  const isPoweringDown = powerInfo?.powerDown?.isActive || false;

  // Validation
  const validation = useMemo(() => {
    if (!amount || amountNum <= 0) {
      return { valid: false, error: undefined };
    }

    if (action === 'powerUp') {
      if (amountNum > liquidBalance) {
        return { valid: false, error: 'Insufficient liquid HIVE balance' };
      }
      if (amountNum < 0.001) {
        return { valid: false, error: 'Minimum power up is 0.001 HIVE' };
      }
    } else {
      // For power down, check against own HP (not delegated)
      const ownHp = hivePower;
      if (amountNum > ownHp) {
        return { valid: false, error: 'Insufficient HIVE Power' };
      }
    }

    return { valid: true, error: undefined };
  }, [amount, amountNum, action, liquidBalance, hivePower]);

  // Handle power up/down
  const handleSubmit = async () => {
    if (!validation.valid || powerMutation.isPending) return;

    try {
      await powerMutation.mutateAsync({
        account,
        action,
        amount: amountNum,
      });

      setAmount('');
      onOperationComplete?.(action);
    } catch (error) {
      logger.error('Power operation failed', 'PowerPanel', error);
    }
  };

  // Handle cancel power down
  const handleCancelPowerDown = async () => {
    if (powerMutation.isPending) return;

    try {
      await powerMutation.mutateAsync({
        account,
        action: 'cancelPowerDown',
      });

      onOperationComplete?.('cancelPowerDown');
    } catch (error) {
      logger.error('Cancel power down failed', 'PowerPanel', error);
    }
  };

  // Quick amount buttons
  const quickAmounts = [0.25, 0.5, 0.75, 1].map((pct) => {
    const maxAmount = action === 'powerUp' ? liquidBalance : hivePower;
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
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <span className="text-muted-foreground">Loading power info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-accent" />
          HIVE Power
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Balance Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted p-3">
            <span className="text-xs text-muted-foreground">Liquid HIVE</span>
            <div className="font-semibold text-foreground">{formatAmount(liquidBalance)} HIVE</div>
          </div>
          <div className="rounded-lg bg-accent/10 p-3">
            <span className="text-xs text-accent">HIVE Power</span>
            <div className="font-semibold text-accent">{formatAmount(hivePower)} HP</div>
          </div>
        </div>

        {/* Effective HP with Delegations */}
        {(delegatedIn > 0 || delegatedOut > 0) && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Effective HP</span>
              <span className="font-medium text-foreground">
                {formatAmount(effectiveHivePower)} HP
              </span>
            </div>
            {delegatedIn > 0 && (
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-success">+ Received</span>
                <span className="text-success">+{formatAmount(delegatedIn)} HP</span>
              </div>
            )}
            {delegatedOut > 0 && (
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-destructive">- Delegated</span>
                <span className="text-destructive">-{formatAmount(delegatedOut)} HP</span>
              </div>
            )}
          </div>
        )}

        {/* Active Power Down Warning */}
        {isPoweringDown && powerInfo?.powerDown && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
              <div className="flex-1">
                <h4 className="font-medium text-warning">Power Down Active</h4>
                <div className="mt-2 space-y-1 text-sm text-warning">
                  <p>
                    Weekly: {powerInfo.powerDown.weeklyAmount} HIVE (
                    {powerInfo.powerDown.weeksRemaining} weeks left)
                  </p>
                  <p>Remaining: {powerInfo.powerDown.remainingAmount} HIVE</p>
                  <p>Next: {formatNextWithdrawal(powerInfo.powerDown.nextWithdrawal)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelPowerDown}
                  disabled={powerMutation.isPending}
                  className="mt-3 border-warning/30 text-warning hover:bg-warning/15"
                >
                  {powerMutation.isPending ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-3 w-3" />
                  )}
                  Cancel Power Down
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Tabs */}
        <div className="flex rounded-lg border border-border p-1">
          <button
            onClick={() => setAction('powerUp')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              action === 'powerUp' ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Zap className="h-4 w-4" />
            Power Up
          </button>
          <button
            onClick={() => setAction('powerDown')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              action === 'powerDown'
                ? 'bg-accent text-white'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <TrendingDown className="h-4 w-4" />
            Power Down
          </button>
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground/80">
            Amount to {action === 'powerUp' ? 'power up' : 'power down'}
          </label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            max={action === 'powerUp' ? liquidBalance : hivePower}
            error={validation.error}
            disabled={powerMutation.isPending}
            symbol={action === 'powerUp' ? 'HIVE' : 'HP'}
          />

          {/* Quick amount buttons */}
          <div className="flex gap-2">
            {quickAmounts.map(({ label, value }) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                onClick={() => setAmount(formatAmount(value))}
                disabled={powerMutation.isPending || value === 0}
                className="flex-1 text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Power Up Info */}
        {action === 'powerUp' && (
          <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <span className="font-medium">Benefits of HIVE Power:</span>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                <li>Increased influence on post rewards</li>
                <li>Higher curation rewards</li>
                <li>More Resource Credits for transactions</li>
                <li>Governance voting power</li>
              </ul>
            </div>
          </div>
        )}

        {/* Power Down Warning */}
        {action === 'powerDown' && (
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <span className="font-medium">Power Down takes 13 weeks</span>
              <p className="mt-1 text-xs">
                {amountNum > 0
                  ? `You'll receive ~${formatAmount(calculateWeeklyPowerDown(amountNum))} HIVE per week for 13 weeks.`
                  : 'Your HIVE Power will be converted to liquid HIVE in 13 weekly installments.'}
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!validation.valid || powerMutation.isPending}
          className="w-full"
        >
          {powerMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {action === 'powerUp' ? (
                <Zap className="mr-2 h-4 w-4" />
              ) : (
                <TrendingDown className="mr-2 h-4 w-4" />
              )}
              {action === 'powerUp' ? 'Power Up' : 'Start Power Down'} {amount || '0'}{' '}
              {action === 'powerUp' ? 'HIVE' : 'HP'}
            </>
          )}
        </Button>

        {/* Mutation Error */}
        {powerMutation.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Operation failed</span>
            </div>
            <p className="mt-1">
              {powerMutation.error instanceof Error
                ? powerMutation.error.message
                : 'An error occurred'}
            </p>
          </div>
        )}

        {/* Advanced Info Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground/80"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show conversion rates
            </>
          )}
        </button>

        {/* Advanced Info */}
        {showAdvanced && powerInfo?.conversionRate && (
          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p>1 HIVE = {parseFloat(powerInfo.conversionRate.vestsPerHive).toFixed(6)} VESTS</p>
            <p>1 VESTS = {parseFloat(powerInfo.conversionRate.hivePerVest).toFixed(6)} HIVE</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PowerPanel;
