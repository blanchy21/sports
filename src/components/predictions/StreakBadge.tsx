'use client';

import { usePredictionStats } from '@/lib/react-query/queries/usePredictionStats';
import { Flame, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils/client';

interface StreakBadgeProps {
  username: string;
  className?: string;
}

export function StreakBadge({ username, className }: StreakBadgeProps) {
  const { data: stats } = usePredictionStats(username);

  if (!stats || Math.abs(stats.currentStreak) < 3) return null;

  const isWinning = stats.currentStreak > 0;
  const count = Math.abs(stats.currentStreak);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
        isWinning ? 'bg-sb-gold/15 text-sb-gold' : 'bg-sb-loss/15 text-sb-loss',
        className
      )}
      title={isWinning ? `${count} win streak` : `${count} loss streak`}
    >
      {isWinning ? <Flame className="h-3 w-3" /> : <Snowflake className="h-3 w-3" />}
      {count}
    </span>
  );
}
