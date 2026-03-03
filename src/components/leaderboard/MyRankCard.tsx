'use client';

/**
 * MyRankCard Component
 *
 * Shows the current user's ranking across leaderboard categories.
 * Compact variant for dashboard, full variant for leaderboard page.
 */

import React from 'react';
import Link from 'next/link';
import { Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { useMyRank } from '@/lib/react-query/queries/useLeaderboard';
import { CATEGORY_CONFIG, ACTIVE_CATEGORIES } from '@/lib/metrics/category-config';

interface MyRankCardProps {
  username: string | undefined;
  compact?: boolean;
}

export function MyRankCard({ username, compact = false }: MyRankCardProps) {
  const { data, isLoading, error } = useMyRank(username);

  if (!username) return null;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading rankings...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Your Rankings</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Unable to load rankings right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Your Rankings This Week</h3>
        </div>
        <span className="text-xs text-muted-foreground">{data.weekId}</span>
      </div>

      {/* Rankings List */}
      <div className="space-y-2">
        {ACTIVE_CATEGORIES.map((category) => {
          const config = CATEGORY_CONFIG[category];
          const rank = data.ranks[category];
          const Icon = config.icon;

          if (!rank) return null;

          return (
            <div
              key={category}
              className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                {!compact && <span className="text-sm">{config.title}</span>}
                {compact && (
                  <span className="text-sm">{config.title.split(' ').slice(0, 2).join(' ')}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {rank.rank ? (
                  <span className={`text-sm font-bold ${rank.rank <= 3 ? 'text-warning' : ''}`}>
                    #{rank.rank}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">--</span>
                )}
                <span className="min-w-[40px] text-right text-sm text-muted-foreground">
                  {rank.value.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Link */}
      <div className="mt-3 border-t pt-3">
        <Link
          href="/leaderboard"
          className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
        >
          View Full Leaderboard
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default MyRankCard;
