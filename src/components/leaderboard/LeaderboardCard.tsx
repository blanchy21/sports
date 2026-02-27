'use client';

/**
 * LeaderboardCard Component
 *
 * Displays a single leaderboard category with rankings.
 */

import React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/core/Avatar';
import { Trophy, TrendingUp, Eye, MessageCircle, Share2, Star, Sparkles } from 'lucide-react';
import type { LeaderboardEntry, RewardCategory } from '@/lib/metrics/types';
import { CONTENT_REWARDS } from '@/lib/rewards/config';

interface LeaderboardCardProps {
  category: RewardCategory;
  entries: LeaderboardEntry[];
  maxEntries?: number;
  showReward?: boolean;
  compact?: boolean;
}

const CATEGORY_CONFIG: Record<
  RewardCategory,
  {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    metric: string;
  }
> = {
  MOST_EXTERNAL_VIEWS: {
    title: 'Most External Views',
    icon: TrendingUp,
    color: 'text-info',
    metric: 'external views',
  },
  MOST_VIEWED_POST: {
    title: 'Most Viewed Post',
    icon: Eye,
    color: 'text-purple-500',
    metric: 'views',
  },
  MOST_COMMENTS: {
    title: 'Top Commenter',
    icon: MessageCircle,
    color: 'text-success',
    metric: 'comments',
  },
  MOST_ENGAGED_POST: {
    title: 'Most Engaged Post',
    icon: Share2,
    color: 'text-orange-500',
    metric: 'engagements',
  },
  POST_OF_THE_WEEK: {
    title: 'Post of the Week',
    icon: Star,
    color: 'text-warning',
    metric: 'curator pick',
  },
  BEST_NEWCOMER: {
    title: 'Best Newcomer',
    icon: Sparkles,
    color: 'text-pink-500',
    metric: 'engagement',
  },
};

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

function getRewardAmount(category: RewardCategory): number | null {
  const config = CONTENT_REWARDS[category];
  if (!config) return null;
  if ('reward' in config) return config.reward;
  if ('maxReward' in config) return config.maxReward;
  return null;
}

export function LeaderboardCard({
  category,
  entries,
  maxEntries = 5,
  showReward = true,
  compact = false,
}: LeaderboardCardProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  const reward = getRewardAmount(category);

  const displayEntries = entries.slice(0, maxEntries);

  if (displayEntries.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <h3 className="font-semibold">{config.title}</h3>
        </div>
        <p className="py-4 text-center text-sm text-muted-foreground">No entries yet this week</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <h3 className="font-semibold">{config.title}</h3>
        </div>
        {showReward && reward && (
          <div className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-sm text-accent">
            <Trophy className="h-3.5 w-3.5" />
            <span>{reward.toLocaleString()} MEDALS</span>
          </div>
        )}
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {displayEntries.map((entry) => (
          <div
            key={`${entry.account}-${entry.postId || entry.rank}`}
            className={`flex items-center gap-3 ${
              compact ? 'py-1' : 'py-2'
            } ${entry.rank === 1 ? '-mx-2 rounded-lg bg-accent/5 px-2' : ''}`}
          >
            {/* Rank Badge */}
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${getRankBadgeClass(
                entry.rank
              )}`}
            >
              {entry.rank}
            </div>

            {/* User Info */}
            <Link
              href={`/user/${entry.account}`}
              className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-80"
            >
              <Avatar alt={entry.account} fallback={entry.account} size="sm" className="h-7 w-7" />
              <span className="truncate font-medium">@{entry.account}</span>
            </Link>

            {/* Value */}
            <div className="flex-shrink-0 text-right">
              <span className="text-sm font-semibold">{entry.value.toLocaleString()}</span>
              {!compact && (
                <span className="ml-1 text-xs text-muted-foreground">{config.metric}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View All Link (if more entries exist) */}
      {entries.length > maxEntries && (
        <div className="mt-3 border-t pt-3">
          <Link
            href={`/leaderboard?category=${category}`}
            className="text-sm text-primary hover:underline"
          >
            View all {entries.length} entries →
          </Link>
        </div>
      )}
    </div>
  );
}

export default LeaderboardCard;
