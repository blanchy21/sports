'use client';

/**
 * LeaderboardGrid Component
 *
 * Displays all leaderboard categories in a grid layout.
 */

import React from 'react';
import { LeaderboardCard } from './LeaderboardCard';
import type { WeeklyLeaderboards, RewardCategory } from '@/lib/metrics/types';
import { Loader2, Trophy } from 'lucide-react';

interface LeaderboardGridProps {
  leaderboards: WeeklyLeaderboards | null;
  isLoading?: boolean;
  error?: string | null;
  weekId?: string;
  showRewards?: boolean;
}

const CATEGORY_ORDER: RewardCategory[] = [
  'MOST_EXTERNAL_VIEWS',
  'MOST_VIEWED_POST',
  'MOST_COMMENTS',
  'MOST_ENGAGED_POST',
  'POST_OF_THE_WEEK',
  'BEST_NEWCOMER',
];

export function LeaderboardGrid({
  leaderboards,
  isLoading = false,
  error = null,
  weekId,
  showRewards = true,
}: LeaderboardGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading leaderboards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-6xl">⚠️</div>
        <h3 className="mb-2 text-xl font-semibold">Error Loading Leaderboards</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!leaderboards) {
    return (
      <div className="py-12 text-center">
        <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-xl font-semibold">No Leaderboard Data</h3>
        <p className="text-muted-foreground">
          Leaderboards will be available once engagement data is collected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Header */}
      {weekId && (
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Trophy className="h-5 w-5 text-warning" />
            Weekly Leaderboards
          </h2>
          <span className="text-sm text-muted-foreground">Week: {weekId}</span>
        </div>
      )}

      {/* Leaderboard Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_ORDER.map((category) => {
          const entries = leaderboards.leaderboards[category] || [];

          // Skip Best Newcomer if empty (only available Year 4+)
          if (category === 'BEST_NEWCOMER' && entries.length === 0) {
            return null;
          }

          return (
            <LeaderboardCard
              key={category}
              category={category}
              entries={entries}
              maxEntries={5}
              showReward={showRewards}
            />
          );
        })}
      </div>

      {/* Generation Time */}
      {leaderboards.generatedAt && (
        <p className="text-center text-xs text-muted-foreground">
          Last updated: {new Date(leaderboards.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default LeaderboardGrid;
