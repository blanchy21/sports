'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/core/Card';
import { PremiumBadge } from './PremiumBadge';
import { useMedalsStake, useMedalsLeaderboard } from '@/lib/react-query/queries/useMedals';
import { PREMIUM_TIERS, type PremiumTier } from '@/lib/hive-engine/constants';
import {
  Trophy,
  TrendingUp,
  Target,
  Loader2,
  Crown,
  Award,
  Star,
  Medal,
  PieChart,
  Gift,
  ChevronRight,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { formatCompact } from '@/lib/utils/formatting';

interface StakingRankCardProps {
  account: string;
  className?: string;
}

const TIER_ORDER: {
  key: PremiumTier;
  threshold: number;
  icon: typeof Crown;
  color: string;
  bgColor: string;
}[] = [
  {
    key: 'BRONZE',
    threshold: PREMIUM_TIERS.BRONZE,
    icon: Medal,
    color: 'text-amber-700 dark:text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    key: 'SILVER',
    threshold: PREMIUM_TIERS.SILVER,
    icon: Star,
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  {
    key: 'GOLD',
    threshold: PREMIUM_TIERS.GOLD,
    icon: Award,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    key: 'PLATINUM',
    threshold: PREMIUM_TIERS.PLATINUM,
    icon: Crown,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
];

export const StakingRankCard: React.FC<StakingRankCardProps> = ({ account, className }) => {
  const { data: stakeInfo, isLoading: stakeLoading } = useMedalsStake(account);
  const { data: leaderboard, isLoading: leaderboardLoading } = useMedalsLeaderboard();

  const isLoading = stakeLoading || leaderboardLoading;

  // Find user's rank in the leaderboard
  const userRank = leaderboard?.holders?.find((h) => h.account === account);
  const totalHolders = leaderboard?.totalHolders || 0;

  const stakedAmount = parseFloat(stakeInfo?.staked || '0');
  const stakeSharePct = parseFloat(stakeInfo?.stakeShare || '0');
  const weeklyReward = stakeInfo?.estimatedWeeklyReward || '0.000';
  const currentTier = stakeInfo?.premiumTier || null;

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <span className="text-sm text-muted-foreground">Loading ranking info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-amber-500" />
          Your Ranking
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Rank */}
          <div className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 p-3 dark:from-amber-900/20 dark:to-amber-800/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              Rank
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {userRank ? `#${userRank.rank}` : '—'}
            </div>
            <div className="text-[11px] text-muted-foreground">of {totalHolders} stakers</div>
          </div>

          {/* Stake Share */}
          <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 dark:from-blue-900/20 dark:to-blue-800/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PieChart className="h-3.5 w-3.5 text-blue-500" />
              Stake Share
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {stakeSharePct > 0 ? `${stakeSharePct.toFixed(2)}%` : '0%'}
            </div>
            <div className="text-[11px] text-muted-foreground">of network</div>
          </div>

          {/* Weekly Rewards */}
          <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3 dark:from-emerald-900/20 dark:to-emerald-800/10">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gift className="h-3.5 w-3.5 text-emerald-500" />
              Weekly
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {formatCompact(parseFloat(weeklyReward))}
            </div>
            <div className="text-[11px] text-muted-foreground">MEDALS/week</div>
          </div>
        </div>

        {/* Tier Roadmap */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
            <Target className="h-4 w-4 text-muted-foreground" />
            Tier Roadmap
          </h4>

          <div className="space-y-1.5">
            {TIER_ORDER.map((tier, index) => {
              const isCurrentTier = currentTier === tier.key;
              const isAchieved = stakedAmount >= tier.threshold;
              const isNext =
                !isAchieved && (index === 0 || stakedAmount >= TIER_ORDER[index - 1].threshold);
              const Icon = tier.icon;
              const remaining = tier.threshold - stakedAmount;

              return (
                <div
                  key={tier.key}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                    isCurrentTier
                      ? 'border-amber-300 bg-amber-50/80 dark:border-amber-700 dark:bg-amber-900/20'
                      : isAchieved
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
                        : isNext
                          ? 'border-border bg-muted/30'
                          : 'border-border/50 bg-background opacity-60'
                  )}
                >
                  {/* Tier icon */}
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      tier.bgColor
                    )}
                  >
                    <Icon className={cn('h-4 w-4', tier.color)} />
                  </div>

                  {/* Tier info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <PremiumBadge tier={tier.key} size="sm" />
                      {isCurrentTier && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatCompact(tier.threshold)} MEDALS staked
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0 text-right">
                    {isAchieved ? (
                      <Check className="h-5 w-5 text-emerald-500" />
                    ) : isNext ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <TrendingUp className="h-3 w-3" />
                          {formatCompact(remaining)} more
                        </div>
                      </div>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Link to full leaderboard */}
        <Link
          href="/leaderboard?view=stakers"
          className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
        >
          View full leaderboard
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
};

export default StakingRankCard;
