'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import type { MatchStat } from '@/types/sports';

interface MatchStatsPanelProps {
  stats: MatchStat[];
  homeTeam?: string;
  awayTeam?: string;
}

/** Stats that appear in the primary (always-visible) section, in display order. */
const KEY_STAT_NAMES = [
  'possessionPct',
  'totalShots',
  'shotsOnTarget',
  'wonCorners',
  'foulsCommitted',
  'offsides',
  'yellowCards',
  'redCards',
  'saves',
];

function parseStatValue(value: string): number {
  const cleaned = value.replace('%', '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function StatRow({ stat }: { stat: MatchStat }) {
  const homeNum = parseStatValue(stat.home);
  const awayNum = parseStatValue(stat.away);
  const total = homeNum + awayNum;

  // When both are zero, show 50/50 bars
  const homePct = total > 0 ? (homeNum / total) * 100 : 50;
  const awayPct = total > 0 ? (awayNum / total) * 100 : 50;

  const homeLeading = homeNum > awayNum;
  const awayLeading = awayNum > homeNum;

  return (
    <div className="space-y-1.5">
      {/* Values + label */}
      <div className="flex items-center justify-between text-sm">
        <span
          className={cn(
            'tabular-nums',
            homeLeading ? 'font-semibold text-sb-text-primary' : 'text-muted-foreground'
          )}
        >
          {stat.home}
        </span>
        <span className="text-xs text-muted-foreground">{stat.displayName}</span>
        <span
          className={cn(
            'tabular-nums',
            awayLeading ? 'font-semibold text-sb-text-primary' : 'text-muted-foreground'
          )}
        >
          {stat.away}
        </span>
      </div>
      {/* Bars */}
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full">
        <div
          className={cn(
            'rounded-l-full transition-all duration-500',
            homeLeading ? 'bg-primary' : 'bg-primary/40'
          )}
          style={{ width: `${homePct}%` }}
        />
        <div
          className={cn(
            'rounded-r-full transition-all duration-500',
            awayLeading ? 'bg-accent' : 'bg-accent/40'
          )}
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  );
}

export function MatchStatsPanel({ stats, homeTeam, awayTeam }: MatchStatsPanelProps) {
  const [showAll, setShowAll] = useState(false);

  if (stats.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No match stats available
      </div>
    );
  }

  // Partition into key stats (ordered) and additional stats
  const keyStats: MatchStat[] = [];
  const additionalStats: MatchStat[] = [];

  const keySet = new Set(KEY_STAT_NAMES);
  const statByName = new Map(stats.map((s) => [s.name, s]));

  // Add key stats in priority order
  for (const name of KEY_STAT_NAMES) {
    const stat = statByName.get(name);
    if (stat) keyStats.push(stat);
  }

  // Everything else goes to additional
  for (const stat of stats) {
    if (!keySet.has(stat.name)) {
      additionalStats.push(stat);
    }
  }

  const visibleStats = showAll ? [...keyStats, ...additionalStats] : keyStats;

  return (
    <div>
      {/* Team header labels */}
      {(homeTeam || awayTeam) && (
        <div className="mb-4 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>{homeTeam ?? 'Home'}</span>
          <span>{awayTeam ?? 'Away'}</span>
        </div>
      )}

      <div className="space-y-4">
        {visibleStats.map((stat) => (
          <StatRow key={stat.name} stat={stat} />
        ))}
      </div>

      {additionalStats.length > 0 && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-sb-text-primary"
        >
          {showAll ? (
            <>
              Show less <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show {additionalStats.length} more stats <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
