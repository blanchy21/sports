'use client';

/**
 * TopStakersWidget Component
 *
 * Compact top-5 stakers widget for the right sidebar.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/core/Avatar';
import { getHiveAvatarUrl } from '@/lib/utils/avatar';
import { Medal, AlertCircle, ExternalLink } from 'lucide-react';
import { logger } from '@/lib/logger';

interface StakerEntry {
  rank: number;
  account: string;
  staked: number;
  total: number;
  premiumTier: string | null;
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount === 0) return '0';
  return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function getRankBadgeClass(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-warning/15 text-warning';
    case 2:
      return 'bg-muted text-foreground/80';
    case 3:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function TopStakersWidget({ className }: { className?: string }) {
  const [holders, setHolders] = useState<StakerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTopStakers = async () => {
      try {
        const response = await fetch('/api/hive-engine/leaderboard');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setHolders(data.holders?.slice(0, 5) || []);
      } catch (err) {
        logger.error('Error fetching top stakers', 'TopStakersWidget', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopStakers();
  }, []);

  return (
    <div className={className || 'rounded-lg border bg-card p-4'}>
      <div className="mb-4 flex items-center space-x-2">
        <Medal className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Top MEDALS Stakers</h3>
      </div>

      {isLoading ? (
        <div className="animate-pulse">
          <div className="mb-2 h-4 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-3 rounded bg-muted" />
            <div className="h-3 rounded bg-muted" />
            <div className="h-3 rounded bg-muted" />
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center space-x-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Unable to load stakers</span>
        </div>
      ) : holders.length > 0 ? (
        <>
          <div className="space-y-2">
            {holders.map((holder) => (
              <Link
                key={holder.account}
                href={`/user/${holder.account}`}
                className="flex items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-accent"
              >
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${getRankBadgeClass(holder.rank)}`}
                >
                  {holder.rank}
                </span>
                <Avatar
                  src={getHiveAvatarUrl(holder.account)}
                  alt={holder.account}
                  fallback={holder.account}
                  size="sm"
                  className="h-6 w-6"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  @{holder.account}
                </span>
                <span className="flex-shrink-0 text-xs font-semibold text-muted-foreground">
                  {formatCompact(holder.staked)}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/leaderboard?view=stakers"
            className="mt-3 block w-full text-center text-sm text-primary hover:underline"
          >
            View full leaderboard
          </Link>
          <a
            href="https://tribaldex.com/trade/MEDALS"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1 text-sm text-amber-600 hover:text-amber-700 hover:underline"
          >
            Buy MEDALS on Tribaldex
            <ExternalLink className="h-3 w-3" />
          </a>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">No stakers found</div>
      )}
    </div>
  );
}

export default TopStakersWidget;
