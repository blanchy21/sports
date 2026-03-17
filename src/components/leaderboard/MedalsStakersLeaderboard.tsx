'use client';

/**
 * MedalsStakersLeaderboard Component
 *
 * Full leaderboard of MEDALS token holders ranked by total holdings.
 * Shows the most recent APR distribution summary and per-user rewards.
 * Used as a tab view on the /leaderboard page.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar } from '@/components/core/Avatar';
import { getHiveAvatarUrl } from '@/lib/utils/avatar';
import { Loader2, Medal, RefreshCw, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { PREMIUM_TIERS } from '@/lib/hive-engine/constants';
import type { PremiumTier } from '@/lib/hive-engine/constants';
import { logger } from '@/lib/logger';

interface StakerEntry {
  rank: number;
  account: string;
  staked: number;
  liquid: number;
  delegatedIn: number;
  delegatedOut: number;
  total: number;
  premiumTier: PremiumTier | null;
  lastReward: number | null;
}

interface DistributionSummary {
  weekId: string;
  apr: number;
  totalStaked: number;
  totalDistributed: number;
  eligibleStakerCount: number;
  status: string;
  distributedAt: string;
}

interface LeaderboardResponse {
  holders: StakerEntry[];
  totalHolders: number;
  timestamp: string;
  latestDistribution: DistributionSummary | null;
}

const TIER_ASSETS: Record<string, { label: string; src: string }> = {
  BRONZE: { label: 'Bronze', src: '/badges/staking/badge-bronze.png' },
  SILVER: { label: 'Silver', src: '/badges/staking/badge-silver.png' },
  GOLD: { label: 'Gold', src: '/badges/staking/badge-gold.png' },
  PLATINUM: { label: 'Platinum', src: '/badges/staking/badge-platinum.png' },
};

function getRankBadgeClass(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-warning/15 text-warning';
    case 2:
      return 'bg-sb-turf text-sb-text-primary/80';
    case 3:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-sb-turf text-muted-foreground';
  }
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount === 0) return '0';
  if (amount < 1) return amount.toFixed(2);
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatReward(amount: number): string {
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount < 0.01) return '<0.01';
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function PremiumBadge({ tier }: { tier: PremiumTier }) {
  const asset = TIER_ASSETS[tier];
  if (!asset) return null;
  return (
    <Image
      src={asset.src}
      alt={`${asset.label} tier`}
      width={16}
      height={20}
      className="inline-block object-contain"
      title={`${asset.label} tier`}
    />
  );
}

function DistributionBanner({ distribution }: { distribution: DistributionSummary }) {
  const isCompleted = distribution.status === 'completed';
  const distributedDate = new Date(distribution.distributedAt);
  const dateStr = distributedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <TrendingUp className="h-4 w-4" />
        Latest Staking Rewards — {distribution.weekId}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">APR</div>
          <div className="text-lg font-bold">{distribution.apr}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Total Distributed</div>
          <div className="text-lg font-bold">
            {formatAmount(distribution.totalDistributed)}{' '}
            <span className="text-xs font-normal text-muted-foreground">MEDALS</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Eligible Stakers</div>
          <div className="text-lg font-bold">{distribution.eligibleStakerCount}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="flex items-center gap-1 text-sm font-medium">
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">Completed</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="capitalize text-yellow-600 dark:text-yellow-400">
                  {distribution.status}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Distributed on {dateStr}</div>
    </div>
  );
}

export function MedalsStakersLeaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hive-engine/leaderboard');
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to fetch leaderboard');
      }
      setData(json);
    } catch (err) {
      logger.error('Error fetching stakers leaderboard', 'MedalsStakersLeaderboard', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-sb-stadium p-8 text-center">
        <p className="text-muted-foreground">Failed to load leaderboard</p>
        <Button variant="outline" size="sm" onClick={fetchLeaderboard} className="mt-3">
          Try again
        </Button>
      </div>
    );
  }

  if (!data || data.holders.length === 0) {
    return (
      <div className="rounded-lg border bg-sb-stadium p-8 text-center">
        <Medal className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-muted-foreground">No MEDALS holders found</p>
      </div>
    );
  }

  const hasRewards = data.latestDistribution !== null;

  return (
    <div className="space-y-4">
      {/* Distribution Banner */}
      {data.latestDistribution && <DistributionBanner distribution={data.latestDistribution} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.totalHolders} holder{data.totalHolders !== 1 ? 's' : ''} (excl. treasury &amp;
          founders)
        </p>
        <Button variant="outline" size="sm" onClick={fetchLeaderboard} aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tier thresholds info */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Tiers:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
          Bronze {PREMIUM_TIERS.BRONZE.toLocaleString()}+
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
          Silver {PREMIUM_TIERS.SILVER.toLocaleString()}+
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-warning" />
          Gold {PREMIUM_TIERS.GOLD.toLocaleString()}+
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-purple-400" />
          Platinum {PREMIUM_TIERS.PLATINUM.toLocaleString()}+
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden rounded-lg border bg-sb-stadium md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3 text-right">Staked</th>
              <th className="px-4 py-3 text-right">Liquid</th>
              <th className="px-4 py-3 text-right">Total</th>
              {hasRewards && <th className="px-4 py-3 text-right">Last Reward</th>}
              <th className="px-4 py-3 text-center">Tier</th>
            </tr>
          </thead>
          <tbody>
            {data.holders.map((holder) => (
              <tr
                key={holder.account}
                className={`border-b transition-colors last:border-0 hover:bg-accent/5 ${
                  holder.rank <= 3 ? 'bg-accent/5' : ''
                }`}
              >
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${getRankBadgeClass(holder.rank)}`}
                  >
                    {holder.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/user/${holder.account}`}
                    className="flex items-center gap-2 transition-opacity hover:opacity-80"
                  >
                    <Avatar
                      src={getHiveAvatarUrl(holder.account)}
                      alt={holder.account}
                      fallback={holder.account}
                      size="sm"
                      className="h-7 w-7"
                    />
                    <span className="font-medium">@{holder.account}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  {formatAmount(holder.staked)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                  {formatAmount(holder.liquid)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                  {formatAmount(holder.total)}
                </td>
                {hasRewards && (
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {holder.lastReward != null ? (
                      <span className="text-green-600 dark:text-green-400">
                        +{formatReward(holder.lastReward)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  {holder.premiumTier ? (
                    <PremiumBadge tier={holder.premiumTier} />
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-2 md:hidden">
        {data.holders.map((holder) => (
          <div
            key={holder.account}
            className={`rounded-lg border bg-sb-stadium p-3 ${holder.rank <= 3 ? 'border-accent/30' : ''}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${getRankBadgeClass(holder.rank)}`}
              >
                {holder.rank}
              </span>
              <Link
                href={`/user/${holder.account}`}
                className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-80"
              >
                <Avatar
                  src={getHiveAvatarUrl(holder.account)}
                  alt={holder.account}
                  fallback={holder.account}
                  size="sm"
                  className="h-7 w-7"
                />
                <span className="truncate font-medium">@{holder.account}</span>
              </Link>
              {holder.premiumTier && <PremiumBadge tier={holder.premiumTier} />}
            </div>
            <div
              className={`mt-2 grid gap-2 pl-10 text-xs ${hasRewards ? 'grid-cols-4' : 'grid-cols-3'}`}
            >
              <div>
                <span className="text-muted-foreground">Staked</span>
                <div className="font-mono font-semibold">{formatAmount(holder.staked)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Liquid</span>
                <div className="font-mono">{formatAmount(holder.liquid)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total</span>
                <div className="font-mono font-semibold">{formatAmount(holder.total)}</div>
              </div>
              {hasRewards && (
                <div>
                  <span className="text-muted-foreground">Reward</span>
                  <div className="font-mono font-semibold">
                    {holder.lastReward != null ? (
                      <span className="text-green-600 dark:text-green-400">
                        +{formatReward(holder.lastReward)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MedalsStakersLeaderboard;
