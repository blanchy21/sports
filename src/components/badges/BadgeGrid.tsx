'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { useUserBadges } from '@/lib/react-query/queries/useUserBadges';
import { BADGE_CATALOGUE } from '@/lib/badges/catalogue';
import { AchievementBadge } from './AchievementBadge';
import { Lock, Crown } from 'lucide-react';
import { SPORT_CATEGORIES } from '@/types/sports';
import type { BadgeCategory } from '@/lib/badges/types';

interface BadgeGridProps {
  username: string;
  className?: string;
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  content: 'Content',
  engagement: 'Engagement',
  predictions: 'Predictions',
  streak: 'Streaks',
  milestone: 'Milestones',
  monthly: 'Monthly Titles',
};

const CATEGORY_ORDER: BadgeCategory[] = [
  'content',
  'engagement',
  'predictions',
  'streak',
  'milestone',
];

export const BadgeGrid: React.FC<BadgeGridProps> = ({ username, className }) => {
  const { data, isLoading } = useUserBadges(username);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <h3 className="text-sm font-semibold text-muted-foreground">Badges</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const earnedIds = new Set(data?.badges.map((b) => b.id) ?? []);

  // Group catalogue by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    badges: BADGE_CATALOGUE.filter((b) => b.category === cat),
  })).filter((g) => g.badges.length > 0);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Badges</h3>
        {data && (
          <span className="text-xs text-muted-foreground">
            {data.stats.totalBadges}/{BADGE_CATALOGUE.length} earned
          </span>
        )}
      </div>

      {grouped.map((group) => (
        <div key={group.category} className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </h4>
          <div className="flex flex-wrap gap-2">
            {group.badges.map((badge) => {
              const earned = earnedIds.has(badge.id);
              if (earned) {
                return <AchievementBadge key={badge.id} badge={badge} size="sm" showLabel />;
              }
              return (
                <span
                  key={badge.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground opacity-50"
                  title={`${badge.name} — ${badge.description}`}
                >
                  <Lock className="h-2.5 w-2.5" />
                  {badge.name}
                </span>
              );
            })}
          </div>
        </div>
      ))}

      {/* Monthly Titles */}
      {data?.monthlyTitles && data.monthlyTitles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Monthly Titles
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.monthlyTitles.map((title) => {
              const sport = SPORT_CATEGORIES.find((c) => c.id === title.sportId);
              return (
                <span
                  key={title.badgeId}
                  className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
                  title={`${sport?.name ?? title.sportId} Writer of the Month (${title.monthId})`}
                >
                  <Crown className="h-2.5 w-2.5" />
                  {sport?.icon} {sport?.name ?? title.sportId} Writer ({title.monthId})
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
