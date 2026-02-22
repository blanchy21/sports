'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/core/Card';
import { Button } from '@/components/core/Button';
import { PremiumBadge, getPremiumTier } from './PremiumBadge';
import {
  useMedalsBalance,
  useMedalsMarket,
  calculateHiveValue,
} from '@/lib/react-query/queries/useMedals';
import {
  Wallet,
  Lock,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Coins,
} from 'lucide-react';

interface WalletCardProps {
  /** Hive account username */
  account: string;
  /** Callback when stake button is clicked */
  onStakeClick?: () => void;
  /** Callback when send/transfer button is clicked */
  onSendClick?: () => void;
  /** Additional className */
  className?: string;
  /** Compact mode for sidebar/smaller spaces */
  compact?: boolean;
}

/**
 * Format a token amount to 3 decimal places
 */
function formatAmount(amount: string | number | undefined): string {
  if (!amount) return '0.000';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.000';
  return num.toFixed(3);
}

/**
 * Stat display component for consistent styling
 */
interface StatProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  subValue?: string;
  className?: string;
}

const Stat: React.FC<StatProps> = ({ label, value, icon, subValue, className }) => (
  <div className={cn('flex flex-col', className)}>
    <span className="flex items-center gap-1 text-xs text-slate-500">
      {icon}
      {label}
    </span>
    <span className="text-lg font-semibold text-slate-900">{value}</span>
    {subValue && <span className="text-xs text-slate-400">{subValue}</span>}
  </div>
);

/**
 * Loading skeleton for the wallet card
 */
const WalletCardSkeleton: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <Card className={cn('w-full', compact ? 'p-3' : '')}>
    <CardHeader className={compact ? 'p-0 pb-3' : ''}>
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
      </div>
    </CardHeader>
    <CardContent className={compact ? 'p-0' : ''}>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </CardContent>
    {!compact && (
      <CardFooter className="gap-2">
        <div className="h-9 flex-1 animate-pulse rounded bg-slate-200" />
        <div className="h-9 flex-1 animate-pulse rounded bg-slate-200" />
      </CardFooter>
    )}
  </Card>
);

/**
 * Error state component
 */
const WalletCardError: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => (
  <Card className="w-full">
    <CardContent className="py-8">
      <div className="flex flex-col items-center space-y-3 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <div>
          <p className="font-medium text-slate-900">Failed to load wallet</p>
          <p className="text-sm text-slate-500">{error.message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    </CardContent>
  </Card>
);

/**
 * WalletCard displays the user's MEDALS balance and staking information
 */
export const WalletCard: React.FC<WalletCardProps> = ({
  account,
  onStakeClick,
  onSendClick,
  className,
  compact = false,
}) => {
  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useMedalsBalance(account);

  const { data: market, isLoading: marketLoading } = useMedalsMarket();

  const isLoading = balanceLoading || marketLoading;

  if (isLoading) {
    return <WalletCardSkeleton compact={compact} />;
  }

  if (balanceError) {
    return <WalletCardError error={balanceError as Error} onRetry={() => refetchBalance()} />;
  }

  const liquid = formatAmount(balance?.liquid);
  const staked = formatAmount(balance?.staked);
  const total = formatAmount(balance?.total);
  const pendingUnstake = formatAmount(balance?.pendingUnstake);
  const hiveValue = calculateHiveValue(balance, market);
  const stakedNum = parseFloat(balance?.staked || '0');
  const premiumTier = getPremiumTier(stakedNum);
  const estimatedAPY = balance?.estimatedAPY || '0.0';

  // Compact mode for sidebars
  if (compact) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-slate-900">MEDALS</span>
            </div>
            <PremiumBadge tier={premiumTier} size="sm" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="font-semibold text-slate-900">{total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Liquid</span>
              <span className="text-slate-700">{liquid}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Staked</span>
              <span className="text-slate-700">{staked}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-sm text-slate-500">Value</span>
              <span className="font-medium text-green-600">{hiveValue} HIVE</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onStakeClick}>
              <Lock className="mr-1 h-3 w-3" />
              Stake
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onSendClick}>
              <ArrowUpRight className="mr-1 h-3 w-3" />
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full mode
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-5 w-5 text-amber-500" />
            MEDALS Wallet
          </CardTitle>
          <PremiumBadge tier={premiumTier} size="md" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat
            label="Liquid Balance"
            value={liquid}
            icon={<Coins className="h-3 w-3" />}
            subValue="Available"
          />
          <Stat
            label="Staked"
            value={staked}
            icon={<Lock className="h-3 w-3" />}
            subValue={parseFloat(pendingUnstake) > 0 ? `${pendingUnstake} unstaking` : undefined}
          />
          <Stat
            label="HIVE Value"
            value={`${hiveValue}`}
            icon={<TrendingUp className="h-3 w-3" />}
            subValue={market?.price ? `@${parseFloat(market.price).toFixed(4)}/MEDALS` : undefined}
            className="text-green-600"
          />
          <Stat
            label="Est. APY"
            value={`${estimatedAPY}%`}
            icon={<TrendingUp className="h-3 w-3" />}
            subValue="From staking"
          />
        </div>

        {/* Total Balance Highlight */}
        <div className="mt-6 rounded-lg border border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-amber-700">Total Balance</span>
              <div className="text-2xl font-bold text-amber-900">{total} MEDALS</div>
            </div>
            {premiumTier && (
              <div className="text-right">
                <span className="text-sm text-amber-700">Tier Status</span>
                <div className="mt-1">
                  <PremiumBadge tier={premiumTier} size="lg" showThreshold />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delegations if present */}
        {(parseFloat(balance?.delegatedIn || '0') > 0 ||
          parseFloat(balance?.delegatedOut || '0') > 0) && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Delegated In:</span>
              <span className="font-medium text-green-600">
                +{formatAmount(balance?.delegatedIn)}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Delegated Out:</span>
              <span className="font-medium text-red-600">
                -{formatAmount(balance?.delegatedOut)}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-3">
        <Button className="flex-1" onClick={onStakeClick}>
          <Lock className="mr-2 h-4 w-4" />
          Stake / Unstake
        </Button>
        <Button variant="outline" className="flex-1" onClick={onSendClick}>
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Send MEDALS
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WalletCard;
