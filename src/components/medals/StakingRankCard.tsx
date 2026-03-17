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
    color: 'text-sb-gold-deep',
    bgColor: 'bg-sb-gold/10',
  },
  {
    key: 'SILVER',
    threshold: PREMIUM_TIERS.SILVER,
    icon: Star,
    color: 'text-sb-text-body',
    bgColor: 'bg-sb-turf',
  },
  {
    key: 'GOLD',
    threshold: PREMIUM_TIERS.GOLD,
    icon: Award,
    color: 'text-sb-gold',
    bgColor: 'bg-sb-gold/15',
  },
  {
    key: 'PLATINUM',
    threshold: PREMIUM_TIERS.PLATINUM,
    icon: Crown,
    color: 'text-sb-teal',
    bgColor: 'bg-sb-teal/10',
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
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
          <Trophy className="h-5 w-5 text-primary" />
          Your Ranking
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Rank */}
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-3 dark:from-primary/10 dark:to-primary/5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              Rank
            </div>
            <div className="mt-1 text-xl font-bold text-sb-text-primary">
              {userRank ? `#${userRank.rank}` : '—'}
            </div>
            <div className="text-[11px] text-muted-foreground">of {totalHolders} stakers</div>
          </div>

          {/* Stake Share */}
          <div className="rounded-lg bg-sb-turf p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PieChart className="h-3.5 w-3.5 text-sb-teal" />
              Stake Share
            </div>
            <div className="mt-1 text-xl font-bold text-sb-text-primary">
              {stakeSharePct > 0 ? `${stakeSharePct.toFixed(2)}%` : '0%'}
            </div>
            <div className="text-[11px] text-muted-foreground">of network</div>
          </div>

          {/* Weekly Rewards */}
          <div className="rounded-lg bg-sb-teal-shadow p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gift className="h-3.5 w-3.5 text-sb-teal" />
              Weekly
            </div>
            <div className="mt-1 text-xl font-bold text-sb-text-primary">
              {formatCompact(parseFloat(weeklyReward))}
            </div>
            <div className="text-[11px] text-muted-foreground">MEDALS/week</div>
          </div>
        </div>

        {/* Tier Roadmap */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium text-sb-text-primary/80">
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
                      ? 'border-primary/40 bg-primary/5 dark:border-primary/30 dark:bg-primary/10'
                      : isAchieved
                        ? 'border-sb-teal/30 bg-sb-teal/5'
                        : isNext
                          ? 'border-sb-border bg-sb-turf/30'
                          : 'border-sb-border/50 bg-background opacity-60'
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
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
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
                      <Check className="h-5 w-5 text-sb-teal" />
                    ) : isNext ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs font-medium text-primary">
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
