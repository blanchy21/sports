'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { useUserBadges } from '@/lib/react-query/queries/useUserBadges';
import { BADGE_CATALOGUE } from '@/lib/badges/catalogue';

interface BadgeInlineProps {
  username: string;
  maxBadges?: number;
  className?: string;
}

/**
 * Compact inline pills showing a user's top earned achievement badges.
 * Renders next to usernames in feeds (PostCard, SportsbiteCard).
 */
export const BadgeInline: React.FC<BadgeInlineProps> = ({ username, maxBadges = 2, className }) => {
  const { data } = useUserBadges(username);

  if (!data?.badges.length) return null;

  // Look up catalogue entries for earned badges to get threshold (prestige proxy)
  const earnedIds = new Set(data.badges.map((b) => b.id));
  const topBadges = BADGE_CATALOGUE.filter((b) => earnedIds.has(b.id))
    .sort((a, b) => b.threshold - a.threshold)
    .slice(0, maxBadges);

  if (topBadges.length === 0) return null;

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {topBadges.map((badge) => (
        <span
          key={badge.id}
          className={cn(
            'inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold text-white',
            badge.bgGradient,
            `shadow-sm ${badge.glowColor}`
          )}
          title={`${badge.name} — ${badge.description}`}
        >
          {badge.name}
        </span>
      ))}
    </span>
  );
};
