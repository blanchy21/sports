'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/core/Avatar';
import { Crown } from 'lucide-react';
import { SPORT_CATEGORIES } from '@/types/sports';

interface MonthlyTitleBadgeProps {
  username: string;
  sportId: string;
  score: number;
  monthId: string;
}

export function MonthlyTitleBadge({ username, sportId, score, monthId }: MonthlyTitleBadgeProps) {
  const sport = SPORT_CATEGORIES.find((c) => c.id === sportId);
  const sportName = sport?.name ?? sportId;
  const sportIcon = sport?.icon ?? '';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
      <div className="relative">
        <Avatar alt={username} fallback={username} size="lg" className="h-12 w-12" />
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] text-warning-foreground">
          <Crown className="h-3 w-3" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-warning">
            {sportIcon} {sportName} Writer of the Month
          </span>
        </div>
        <Link
          href={`/user/${username}`}
          className="truncate text-base font-semibold hover:underline"
        >
          @{username}
        </Link>
        <p className="text-xs text-muted-foreground">
          {score} content pieces in {monthId}
        </p>
      </div>
    </div>
  );
}
