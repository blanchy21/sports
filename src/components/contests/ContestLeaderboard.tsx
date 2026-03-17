'use client';

import React from 'react';
import { Trophy, Medal } from 'lucide-react';
import { useContestLeaderboard } from '@/lib/react-query/queries/useContests';
import { cn } from '@/lib/utils/client';
import Link from 'next/link';

const RANK_STYLES: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-gray-400',
  3: 'text-amber-700',
};

export function ContestLeaderboard({ slug }: { slug: string }) {
  const { data, isLoading, error } = useContestLeaderboard(slug);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-sb-turf/50" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">Failed to load leaderboard.</p>;
  }

  const entries = data?.entries || [];

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Trophy className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">No entries yet. Be the first to enter!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_80px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Rank</span>
        <span>Player</span>
        <span className="text-right">Score</span>
      </div>

      {/* Entries */}
      {entries.map((entry) => (
        <div
          key={entry.username}
          className={cn(
            'grid grid-cols-[40px_1fr_80px] items-center gap-2 rounded-lg px-3 py-2.5',
            entry.rank <= 3 ? 'bg-amber-500/5' : 'hover:bg-sb-turf/50'
          )}
        >
          {/* Rank */}
          <div className="flex items-center justify-center">
            {entry.rank <= 3 ? (
              <Medal className={cn('h-5 w-5', RANK_STYLES[entry.rank])} />
            ) : (
              <span className="text-sm text-muted-foreground">{entry.rank}</span>
            )}
          </div>

          {/* Username */}
          <Link
            href={`/user/${entry.username}`}
            className="truncate text-sm font-medium hover:underline"
          >
            @{entry.username}
          </Link>

          {/* Score */}
          <div className="text-right">
            <span
              className={cn('text-sm font-semibold', entry.rank <= 3 && RANK_STYLES[entry.rank])}
            >
              {entry.totalScore.toLocaleString()}
            </span>
            <span className="ml-0.5 text-xs text-muted-foreground">pts</span>
          </div>
        </div>
      ))}

      {data?.pagination?.hasMore && (
        <p className="py-2 text-center text-xs text-muted-foreground">
          Showing top {entries.length} of {data.pagination.total}
        </p>
      )}
    </div>
  );
}
