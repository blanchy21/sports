'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/client';
import { TrendingUp, Sparkles } from 'lucide-react';
import { useWeeklyLeaderboards } from '@/lib/react-query/queries/useLeaderboard';

interface RisingStarsProps {
  currentWeekId: string;
  className?: string;
}

/** Compute the previous ISO week ID from a YYYY-W## string */
function getPreviousWeekId(weekId: string): string {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekId;

  let year = parseInt(match[1], 10);
  let week = parseInt(match[2], 10);

  week--;
  if (week < 1) {
    year--;
    // ISO weeks in a year: either 52 or 53
    const dec28 = new Date(year, 11, 28);
    const dayOfYear = Math.ceil((dec28.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1);
    week = Math.ceil((dayOfYear - ((dec28.getDay() + 6) % 7) + 3) / 7);
  }

  return `${year}-W${week.toString().padStart(2, '0')}`;
}

interface RisingStar {
  username: string;
  improvement: number; // positive = moved up
  isNew: boolean;
  currentRank: number;
}

export function RisingStars({ currentWeekId, className }: RisingStarsProps) {
  const previousWeekId = getPreviousWeekId(currentWeekId);

  const { data: currentData } = useWeeklyLeaderboards(currentWeekId, 50);
  const { data: previousData } = useWeeklyLeaderboards(previousWeekId, 50);

  if (!currentData?.leaderboards) return null;

  // Use MOST_ENGAGED_POST as the "overall" category for ranking changes
  // since it best represents overall engagement
  const currentEntries = currentData.leaderboards.MOST_ENGAGED_POST ?? [];
  const previousEntries = previousData?.leaderboards?.MOST_ENGAGED_POST ?? [];

  // Build previous-week rank lookup
  const prevRankMap = new Map<string, number>();
  previousEntries.forEach((entry) => {
    prevRankMap.set(entry.account, entry.rank);
  });

  // Calculate improvements
  const stars: RisingStar[] = currentEntries
    .map((entry) => {
      const prevRank = prevRankMap.get(entry.account);
      if (prevRank === undefined) {
        return {
          username: entry.account,
          improvement: 999, // NEW entries sort high
          isNew: true,
          currentRank: entry.rank,
        };
      }
      const improvement = prevRank - entry.rank;
      return {
        username: entry.account,
        improvement,
        isNew: false,
        currentRank: entry.rank,
      };
    })
    .filter((s) => s.improvement > 0 || s.isNew)
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, 5);

  if (stars.length === 0) return null;

  return (
    <div className={cn('rounded-lg border bg-sb-stadium p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-success" />
        <h3 className="font-semibold">Rising Stars</h3>
      </div>

      <div className="space-y-2">
        {stars.map((star) => (
          <Link
            key={star.username}
            href={`/user/${star.username}`}
            className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-sb-turf/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">#{star.currentRank}</span>
              <span className="text-sm font-medium">{star.username}</span>
            </div>
            {star.isNew ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-info">
                <Sparkles className="h-3 w-3" />
                NEW
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-success">
                <TrendingUp className="h-3 w-3" />+{star.improvement}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
