'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/core/Avatar';
import { Loader2 } from 'lucide-react';
import {
  useAllTimeLeaderboard,
  type AllTimeMetric,
} from '@/lib/react-query/queries/useLeaderboard';

const METRICS: { value: AllTimeMetric; label: string; unit: string }[] = [
  { value: 'medals', label: 'MEDALS Earned', unit: 'MEDALS' },
  { value: 'posts', label: 'Posts Published', unit: 'posts' },
  { value: 'sportsbites', label: 'Sportsbites', unit: 'bites' },
  { value: 'comments', label: 'Comments Made', unit: 'comments' },
  { value: 'views', label: 'Views Received', unit: 'views' },
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

export function AllTimeLeaderboardView() {
  const [metric, setMetric] = useState<AllTimeMetric>('medals');
  const { data, isLoading } = useAllTimeLeaderboard(metric);
  const currentMetricConfig = METRICS.find((m) => m.value === metric)!;

  return (
    <div className="space-y-4">
      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMetric(m.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              metric === m.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.entries?.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No all-time data available yet
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
                  <span className="ml-1 text-xs text-muted-foreground">
                    {currentMetricConfig.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
