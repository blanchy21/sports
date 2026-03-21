'use client';

import React from 'react';
import { Trophy, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import type { IplBbCompetitionDetail } from '@/lib/ipl-bb/types';

function formatDateRange(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${f.toLocaleDateString('en-US', opts)} – ${t.toLocaleDateString('en-US', opts)}, ${t.getFullYear()}`;
}

interface IplBbHeroProps {
  competition: IplBbCompetitionDetail;
  userRank?: number | null;
  userPoints?: number | null;
  hasEntered?: boolean;
}

export const IplBbHero = React.memo(function IplBbHero({
  competition,
  userRank,
  userPoints,
  hasEntered,
}: IplBbHeroProps) {
  const resolvedCount = competition.matches.filter((m) => m.status === 'resolved').length;
  const totalPrize = competition.prizeFirst + competition.prizeSecond + competition.prizeThird;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-sb-stadium">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at top right, rgba(245,158,11,0.4), transparent 60%)',
        }}
      />

      <div className="relative px-5 py-6">
        {/* Title + status */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{competition.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateRange(competition.dateFrom, competition.dateTo)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {competition.totalEntries} players
              </span>
              <span>
                {resolvedCount}/{competition.totalMatches} matches resolved
              </span>
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1',
              competition.status === 'active'
                ? 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400'
                : competition.status === 'complete'
                  ? 'bg-sb-turf text-muted-foreground ring-border'
                  : 'bg-green-500/10 text-green-600 ring-green-500/20 dark:text-green-400'
            )}
          >
            {competition.status === 'active' ? 'LIVE' : competition.status.toUpperCase()}
          </span>
        </div>

        {/* Prize + user rank row */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Prize pool */}
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-amber-500/10 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 ring-1 ring-amber-500/20">
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400/80">
                Prize Pool
              </div>
              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                {totalPrize.toLocaleString()}{' '}
                <span className="text-xs font-semibold opacity-70">MEDALS</span>
              </div>
            </div>
          </div>

          {/* User rank (if entered) */}
          {hasEntered && userRank != null && (
            <div className="flex items-center gap-3 rounded-xl border bg-sb-turf/30 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sb-turf ring-1 ring-border">
                <span className="text-lg font-bold">#{userRank}</span>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Your Rank
                </div>
                <div className="text-xl font-extrabold">
                  {userPoints ?? 0}{' '}
                  <span className="text-xs font-semibold text-muted-foreground">pts</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rules hint */}
        <div className="mt-4 rounded-lg bg-sb-turf/30 px-4 py-3 text-sm text-muted-foreground">
          <strong className="text-foreground">How it works:</strong> Guess the total boundaries (4s
          + 6s) in each match. If your guess is equal to or under the actual count, you score points
          equal to your guess. Go over and you bust — zero points. Highest total across all matches
          wins.
        </div>
      </div>
    </div>
  );
});
