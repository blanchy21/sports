'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { useUserBadges } from '@/lib/react-query/queries/useUserBadges';
import { useUserStats } from '@/lib/react-query/queries/useUserStats';
import { usePredictionStats } from '@/lib/react-query/queries/usePredictionStats';
import { BADGE_CATALOGUE } from '@/lib/badges/catalogue';
import { AchievementBadge } from './AchievementBadge';
import type { BadgeDefinition } from '@/lib/badges/types';

interface BadgeProgressProps {
  username: string;
  className?: string;
}

/** Resolve current metric value from user stats + prediction stats for a badge */
function getMetricValue(
  badge: BadgeDefinition,
  stats: {
    totalPosts: number;
    totalSportsbites: number;
    totalComments: number;
    totalViewsReceived: number;
    totalMedalsEarned: number;
    currentPostingStreak: number;
    longestPostingStreak: number;
    memberSince: string;
  } | null,
  predictionStats: {
    totalPredictions: number;
    winRate: number;
    bestStreak: number;
  } | null
): number {
  if (!stats) return 0;

  const metric = badge.metric;

  // Direct UserStats fields
  const directMap: Record<string, number> = {
    totalPosts: stats.totalPosts,
    totalSportsbites: stats.totalSportsbites,
    totalComments: stats.totalComments,
    totalViewsReceived: stats.totalViewsReceived,
    totalMedalsEarned: stats.totalMedalsEarned,
    currentPostingStreak: stats.currentPostingStreak,
    longestPostingStreak: stats.longestPostingStreak,
  };

  if (metric in directMap) return directMap[metric];

  // Tenure in months
  if (metric === 'tenure_months') {
    const since = new Date(stats.memberSince);
    const now = new Date();
    return (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth());
  }

  // Prediction metrics
  if (metric.startsWith('predictions.') && predictionStats) {
    const predMap: Record<string, number> = {
      'predictions.total': predictionStats.totalPredictions,
      'predictions.winRate': predictionStats.winRate,
      'predictions.bestStreak': predictionStats.bestStreak,
    };
    return predMap[metric] ?? 0;
  }

  return 0;
}

export const BadgeProgress: React.FC<BadgeProgressProps> = ({ username, className }) => {
  const { data: badgeData } = useUserBadges(username);
  const { data: statsData } = useUserStats(username);
  const { data: predictionData } = usePredictionStats(username);

  if (!badgeData || !statsData) return null;

  const earnedIds = new Set(badgeData.badges.map((b) => b.id));

  const stats = statsData.stats;
  const predStats = predictionData
    ? {
        totalPredictions: predictionData.totalPredictions,
        winRate: predictionData.winRate,
        bestStreak: predictionData.bestStreak,
      }
    : null;

  // Calculate progress for unearned badges
  const progressBadges = BADGE_CATALOGUE.filter((badge) => !earnedIds.has(badge.id))
    .map((badge) => {
      const current = getMetricValue(badge, stats, predStats);
      const progress = Math.min(current / badge.threshold, 1);
      return { badge, current, progress };
    })
    .filter((item) => item.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 6);

  if (progressBadges.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-semibold text-muted-foreground">Next Badges</h3>
      <div className="space-y-2">
        {progressBadges.map(({ badge, current, progress }) => (
          <div key={badge.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <AchievementBadge badge={badge} size="sm" showLabel />
              <span className="text-xs text-muted-foreground">
                {formatValue(current, badge.metric)} / {formatValue(badge.threshold, badge.metric)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', badge.bgGradient)}
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatValue(value: number, metric: string): string {
  if (metric === 'predictions.winRate') {
    return `${Math.round(value * 100)}%`;
  }
  if (metric === 'tenure_months') {
    return `${Math.round(value)}mo`;
  }
  return value.toLocaleString();
}
