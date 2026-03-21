'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import type { IplBbLeaderboardEntry } from '@/lib/ipl-bb/types';

function getRankDisplay(rank: number): string {
  if (rank === 1) return '\u{1F947}';
  if (rank === 2) return '\u{1F948}';
  if (rank === 3) return '\u{1F949}';
  return `${rank}`;
}

interface IplBbLeaderboardProps {
  entries: IplBbLeaderboardEntry[];
  currentUser?: string;
  prizeFirst: number;
  prizeSecond: number;
  prizeThird: number;
  isLoading?: boolean;
}

export const IplBbLeaderboard = React.memo(function IplBbLeaderboard({
  entries,
  currentUser,
  prizeFirst,
  prizeSecond,
  prizeThird,
  isLoading,
}: IplBbLeaderboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex h-12 animate-pulse items-center gap-3 rounded-lg bg-sb-turf/50 px-4"
          />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No entries yet. Be the first to join!
      </div>
    );
  }

  const prizes = [prizeFirst, prizeSecond, prizeThird];

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Header */}
      <div className="grid grid-cols-[3rem_1fr_4rem_4rem_4rem] gap-2 border-b bg-sb-turf/50 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[3rem_1fr_4.5rem_4rem_4rem_5rem]">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">Points</div>
        <div className="text-right">Hits</div>
        <div className="text-right">Busts</div>
        <div className="hidden text-right sm:block">Prize</div>
      </div>

      {/* Rows */}
      {entries.map((entry) => (
        <div
          key={entry.username}
          className={cn(
            'grid grid-cols-[3rem_1fr_4rem_4rem_4rem] gap-2 border-b px-4 py-2.5 text-sm last:border-b-0 sm:grid-cols-[3rem_1fr_4.5rem_4rem_4rem_5rem]',
            entry.username === currentUser && 'bg-amber-500/5',
            entry.rank <= 3 && 'bg-sb-turf/20'
          )}
        >
          <div className="flex items-center">
            <span className={cn('text-base', entry.rank <= 3 && 'text-lg')}>
              {getRankDisplay(entry.rank)}
            </span>
          </div>
          <div className="flex items-center truncate">
            <span
              className={cn(
                'truncate font-medium',
                entry.username === currentUser && 'text-amber-600 dark:text-amber-400'
              )}
            >
              @{entry.username}
            </span>
          </div>
          <div className="flex items-center justify-end font-bold tabular-nums">
            {entry.totalPoints}
          </div>
          <div className="flex items-center justify-end tabular-nums text-green-600 dark:text-green-400">
            {entry.hitCount}
          </div>
          <div className="flex items-center justify-end tabular-nums text-red-500">
            {entry.bustCount}
          </div>
          <div className="hidden items-center justify-end text-xs font-medium sm:flex">
            {entry.rank <= 3 && prizes[entry.rank - 1] ? (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                {prizes[entry.rank - 1]} MEDALS
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
});
