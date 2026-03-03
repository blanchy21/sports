'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { getHiveAvatarUrl } from '@/lib/utils/avatar';
import { usePredictionLeaderboard } from '@/hooks/usePredictions';
import { cn } from '@/lib/utils/client';
import {
  ArrowLeft,
  Trophy,
  Target,
  Flame,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

type SortOption = 'profit' | 'winrate' | 'streak';
type PeriodOption = 'alltime' | 'month' | 'week';

const SORT_TABS: { value: SortOption; label: string }[] = [
  { value: 'profit', label: 'Profit' },
  { value: 'winrate', label: 'Win Rate' },
  { value: 'streak', label: 'Streak' },
];

const PERIOD_TABS: { value: PeriodOption; label: string }[] = [
  { value: 'alltime', label: 'All Time' },
  { value: 'month', label: 'This Month' },
  { value: 'week', label: 'This Week' },
];

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

export default function PredictionsLeaderboardPage() {
  const [sort, setSort] = useState<SortOption>('profit');
  const [period, setPeriod] = useState<PeriodOption>('alltime');

  const {
    data: leaderboard,
    isLoading,
    error,
    refetch,
  } = usePredictionLeaderboard({
    sort,
    period,
    limit: 50,
  });

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur-xl">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Link
                href="/predictions"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 shadow-lg">
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-2xl font-bold">
                  Leaderboard
                </h1>
                <p className="text-sm text-muted-foreground">Top prediction performers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sort Tabs */}
        <div className="mb-3 flex gap-2">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSort(tab.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                sort === tab.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Period Filter */}
        <div className="mb-6 flex gap-1.5">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                period === tab.value
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : !leaderboard || leaderboard.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden rounded-lg border bg-card md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-center">#</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3 text-center">Record</th>
                    <th className="px-4 py-3 text-right">Win Rate</th>
                    <th className="px-4 py-3 text-right">P/L</th>
                    <th className="px-4 py-3 text-center">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => {
                    const rank = i + 1;
                    return (
                      <tr
                        key={entry.username}
                        className={cn(
                          'border-b transition-colors last:border-0 hover:bg-accent/5',
                          rank <= 3 && 'bg-accent/5'
                        )}
                      >
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                              getRankBadgeClass(rank)
                            )}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/user/${entry.username}`}
                            className="flex items-center gap-2 transition-opacity hover:opacity-80"
                          >
                            <Avatar
                              src={getHiveAvatarUrl(entry.username)}
                              alt={entry.username}
                              fallback={entry.username}
                              size="sm"
                              className="h-7 w-7"
                            />
                            <span className="font-medium">@{entry.username}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {entry.wins}W-{entry.losses}L
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {(entry.winRate * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 font-mono text-sm font-semibold',
                              entry.profitLoss >= 0 ? 'text-success' : 'text-destructive'
                            )}
                          >
                            {entry.profitLoss >= 0 ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            {entry.profitLoss >= 0 ? '+' : ''}
                            {entry.profitLoss.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StreakBadge streak={entry.currentStreak} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-2 md:hidden">
              {leaderboard.map((entry, i) => {
                const rank = i + 1;
                return (
                  <div
                    key={entry.username}
                    className={cn('rounded-lg border bg-card p-3', rank <= 3 && 'border-accent/30')}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          getRankBadgeClass(rank)
                        )}
                      >
                        {rank}
                      </span>
                      <Link
                        href={`/user/${entry.username}`}
                        className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-80"
                      >
                        <Avatar
                          src={getHiveAvatarUrl(entry.username)}
                          alt={entry.username}
                          fallback={entry.username}
                          size="sm"
                          className="h-7 w-7"
                        />
                        <span className="truncate font-medium">@{entry.username}</span>
                      </Link>
                      <StreakBadge streak={entry.currentStreak} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 pl-10 text-xs">
                      <div>
                        <span className="text-muted-foreground">Record</span>
                        <div className="font-semibold">
                          {entry.wins}W-{entry.losses}L
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Win Rate</span>
                        <div className="font-mono font-semibold">
                          {(entry.winRate * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">P/L</span>
                        <div
                          className={cn(
                            'font-mono font-semibold',
                            entry.profitLoss >= 0 ? 'text-success' : 'text-destructive'
                          )}
                        >
                          {entry.profitLoss >= 0 ? '+' : ''}
                          {entry.profitLoss.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

function StreakBadge({ streak }: { streak?: number }) {
  if (!streak || streak === 0) return <span className="text-xs text-muted-foreground">-</span>;

  if (streak > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Flame className="h-3 w-3" />
        {streak}
      </span>
    );
  }

  return <span className="text-xs font-medium text-muted-foreground">{Math.abs(streak)} cold</span>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-muted" />
            <div className="h-7 w-7 rounded-full bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="ml-auto h-4 w-16 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border bg-card p-12 text-center">
      <div className="mb-4 flex justify-center">
        <div className="rounded-full bg-amber-500/10 p-4">
          <Target className="h-12 w-12 text-amber-500" />
        </div>
      </div>
      <h3 className="mb-2 text-xl font-semibold">No predictions yet</h3>
      <p className="mx-auto max-w-sm text-muted-foreground">
        Once users start making predictions, the leaderboard will show the top performers.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <div className="mb-4 flex justify-center">
        <div className="rounded-full bg-destructive/15 p-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold">Failed to Load Leaderboard</h3>
      <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
