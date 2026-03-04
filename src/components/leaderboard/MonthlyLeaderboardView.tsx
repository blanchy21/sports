'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useMonthlyLeaderboard } from '@/lib/react-query/queries/useLeaderboard';
import { getMonthId, getPreviousMonthId, getNextMonthId } from '@/lib/metrics/monthly-leaderboard';
import { SPORT_CATEGORIES } from '@/types/sports';
import { MonthlyTitleBadge } from './MonthlyTitleBadge';

const OVERALL_OPTION = { id: '_overall', name: 'All Sports', icon: '' } as const;

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

function formatMonthLabel(monthId: string): string {
  const [year, month] = monthId.split('-').map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function MonthlyLeaderboardView() {
  const currentMonthId = useMemo(() => getMonthId(), []);
  // Default to previous month (current month is in progress)
  const [monthId, setMonthId] = useState(() => getPreviousMonthId(currentMonthId));
  const [sportId, setSportId] = useState<string>('_overall');

  const { data, isLoading } = useMonthlyLeaderboard(
    monthId,
    sportId === '_overall' ? undefined : sportId
  );

  const handlePrevMonth = () => setMonthId((prev) => getPreviousMonthId(prev));
  const handleNextMonth = () => {
    const next = getNextMonthId(monthId);
    if (next <= currentMonthId) setMonthId(next);
  };

  const isNextDisabled = getNextMonthId(monthId) > currentMonthId;

  // Build sport options — only show sports that have data
  const sportOptions = useMemo(() => {
    const mainSports = SPORT_CATEGORIES.filter((c) => c.id !== 'general').map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
    }));
    return [OVERALL_OPTION, ...mainSports];
  }, []);

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[160px] rounded bg-muted px-3 py-1 text-center text-sm font-medium">
            {formatMonthLabel(monthId)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={isNextDisabled}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Sport Filter */}
        <select
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          {sportOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Title Holder */}
      {data?.titleHolder && sportId !== '_overall' && (
        <MonthlyTitleBadge
          username={data.titleHolder.username}
          sportId={sportId}
          score={data.titleHolder.score}
          monthId={monthId}
        />
      )}

      {/* Entries */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.entries?.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No monthly data available for {formatMonthLabel(monthId)}
          </p>
        ) : (
          <div className="divide-y">
            {data.entries.map((entry) => (
              <div
                key={entry.account}
                className={`flex items-center gap-3 px-4 py-3 ${
                  entry.rank <= 3 ? 'bg-accent/5' : ''
                }`}
              >
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${getRankBadgeClass(entry.rank)}`}
                >
                  {entry.rank}
                </div>
                <Link
                  href={`/user/${entry.account}`}
                  className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-80"
                >
                  <Avatar
                    alt={entry.account}
                    fallback={entry.account}
                    size="sm"
                    className="h-7 w-7"
                  />
                  <span className="truncate font-medium">@{entry.account}</span>
                </Link>
                <div className="flex-shrink-0 text-right">
                  <span className="text-sm font-semibold">{entry.value.toLocaleString()}</span>
                  <span className="ml-1 text-xs text-muted-foreground">content</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
