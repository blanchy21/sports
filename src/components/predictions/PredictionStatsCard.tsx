'use client';

import { usePredictionStats } from '@/lib/react-query/queries/usePredictionStats';
import { SPORT_CATEGORIES } from '@/types';
import { Target, Flame, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils/client';

interface PredictionStatsCardProps {
  username: string;
}

export function PredictionStatsCard({ username }: PredictionStatsCardProps) {
  const { data: stats, isLoading } = usePredictionStats(username);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-sb-stadium p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 rounded bg-sb-turf" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 rounded bg-sb-turf" />
            <div className="h-16 rounded bg-sb-turf" />
            <div className="h-16 rounded bg-sb-turf" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.totalPredictions === 0) return null;

  const profitPositive = stats.profitLoss >= 0;

  return (
    <div className="rounded-lg border border-amber-500/20 bg-sb-stadium p-4">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-5 w-5 text-amber-500" />
        <h3 className="text-base font-semibold">Prediction Stats</h3>
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCell label="Record" value={`${stats.wins}W - ${stats.losses}L`} />
        <StatCell
          label="Win Rate"
          value={`${(stats.winRate * 100).toFixed(0)}%`}
          valueClass={stats.winRate >= 0.5 ? 'text-success' : 'text-destructive'}
        />
        <StatCell
          label="Current Streak"
          value={
            stats.currentStreak === 0
              ? '—'
              : stats.currentStreak > 0
                ? `${stats.currentStreak}W`
                : `${Math.abs(stats.currentStreak)}L`
          }
          icon={
            stats.currentStreak > 0 ? <Flame className="h-3.5 w-3.5 text-amber-500" /> : undefined
          }
        />
        <StatCell
          label="Best Streak"
          value={stats.bestStreak > 0 ? `${stats.bestStreak}W` : '—'}
          icon={
            stats.bestStreak > 0 ? <Trophy className="h-3.5 w-3.5 text-amber-500" /> : undefined
          }
        />
      </div>

      {/* P/L row */}
      <div className="mt-3 flex items-center gap-4 rounded-lg bg-sb-turf/50 px-3 py-2 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Staked:</span>
          <span className="font-medium">{stats.totalStaked.toFixed(0)} MEDALS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">P/L:</span>
          <span
            className={cn(
              'flex items-center gap-1 font-medium',
              profitPositive ? 'text-success' : 'text-destructive'
            )}
          >
            {profitPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {profitPositive ? '+' : ''}
            {stats.profitLoss.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Per-sport breakdown */}
      {stats.bySport.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">By Sport</p>
          <div className="space-y-1.5">
            {stats.bySport.slice(0, 5).map((sport) => {
              const category = SPORT_CATEGORIES.find((c) => c.id === sport.sportCategory);
              const pct = sport.winRate * 100;
              return (
                <div key={sport.sportCategory} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-center text-xs">{category?.icon ?? '?'}</span>
                  <span className="w-20 truncate text-muted-foreground">
                    {category?.name ?? sport.sportCategory}
                  </span>
                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-sb-turf">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pct >= 50 ? 'bg-success' : 'bg-amber-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-right text-xs text-muted-foreground">
                    {sport.wins}/{sport.total} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent results dots */}
      {stats.recentResults.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Recent</p>
          <div className="flex items-center gap-1">
            {stats.recentResults.map((result) => (
              <span
                key={result.predictionId}
                className={cn('h-3 w-3 rounded-full', result.won ? 'bg-success' : 'bg-destructive')}
                title={`${result.title} — ${result.won ? 'Won' : 'Lost'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  valueClass,
  icon,
}: {
  label: string;
  value: string;
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-sb-turf/50 p-2.5 text-center">
      <div className={cn('flex items-center justify-center gap-1 text-lg font-bold', valueClass)}>
        {icon}
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
