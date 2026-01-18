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
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading leaderboards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold mb-2">Error Loading Leaderboards</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!leaderboards) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Leaderboard Data</h3>
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
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Weekly Leaderboards
          </h2>
          <span className="text-sm text-muted-foreground">
            Week: {weekId}
          </span>
        </div>
      )}

      {/* Leaderboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <p className="text-xs text-muted-foreground text-center">
          Last updated:{' '}
          {new Date(leaderboards.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default LeaderboardGrid;
