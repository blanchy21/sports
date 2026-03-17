'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/client';
import { Crown } from 'lucide-react';
import { useWeeklyLeaderboards } from '@/lib/react-query/queries/useLeaderboard';
import { ACTIVE_CATEGORIES, CATEGORY_CONFIG } from '@/lib/metrics/category-config';
import { getRewardAmount } from '@/lib/metrics/category-config';

interface WeeklyWinnersProps {
  weekId: string;
  className?: string;
}

export function WeeklyWinners({ weekId, className }: WeeklyWinnersProps) {
  const { data: leaderboards } = useWeeklyLeaderboards(weekId, 1);

  if (!leaderboards?.leaderboards) return null;

  const winners = ACTIVE_CATEGORIES.map((category) => {
    const entries = leaderboards.leaderboards[category];
    if (!entries || entries.length === 0) return null;
    const winner = entries[0];
    const config = CATEGORY_CONFIG[category];
    const reward = getRewardAmount(category);
    return { category, winner, config, reward };
  }).filter(Boolean) as {
    category: string;
    winner: { account: string; value: number };
    config: {
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      metric: string;
    };
    reward: number | null;
  }[];

  if (winners.length === 0) return null;

  return (
    <div className={cn('rounded-lg border bg-sb-stadium p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Crown className="h-5 w-5 text-warning" />
        <h3 className="font-semibold">This Week&apos;s Winners</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {winners.map(({ category, winner, config, reward }) => {
          const Icon = config.icon;
          return (
            <Link
              key={category}
              href={`/user/${winner.account}`}
              className="flex min-w-[140px] flex-col items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3 transition-colors hover:bg-warning/10"
            >
              <div className="flex items-center gap-1">
                <Icon className={cn('h-3.5 w-3.5', config.color)} />
                <span className="text-xs font-medium text-muted-foreground">{config.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <Crown className="h-3 w-3 text-warning" />
                <span className="text-sm font-bold">{winner.account}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {winner.value.toLocaleString()} {config.metric ?? ''}
              </span>
              {reward && (
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning">
                  {reward} MEDALS
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
