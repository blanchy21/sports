'use client';

import React from 'react';
import { Check, X, Clock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import type { IplBbPickWithResult } from '@/lib/ipl-bb/types';

interface IplBbMyPicksProps {
  picks: IplBbPickWithResult[];
  isLoading?: boolean;
}

function getResultIcon(pick: IplBbPickWithResult) {
  if (pick.matchStatus === 'resolved') {
    if (pick.guess == null)
      return { icon: <span className="text-muted-foreground">—</span>, label: 'Skipped' };
    if (pick.isBust) return { icon: <X className="h-4 w-4 text-red-500" />, label: 'Bust' };
    return { icon: <Check className="h-4 w-4 text-green-500" />, label: 'Hit' };
  }
  if (pick.matchStatus === 'locked')
    return { icon: <Clock className="h-4 w-4 text-muted-foreground" />, label: 'Pending' };
  return { icon: <Unlock className="h-4 w-4 text-amber-500" />, label: 'Open' };
}

export const IplBbMyPicks = React.memo(function IplBbMyPicks({
  picks,
  isLoading,
}: IplBbMyPicksProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex h-14 animate-pulse items-center rounded-lg bg-sb-turf/50 px-4"
          />
        ))}
      </div>
    );
  }

  if (picks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No matches in this round yet.
      </div>
    );
  }

  const totalPoints = picks.reduce((sum, p) => sum + (p.pointsScored ?? 0), 0);
  const hits = picks.filter(
    (p) => p.matchStatus === 'resolved' && p.guess != null && !p.isBust
  ).length;
  const busts = picks.filter((p) => p.isBust === true).length;

  return (
    <div>
      {/* Summary bar */}
      <div className="mb-3 flex items-center gap-4 rounded-lg bg-sb-turf/30 px-4 py-2.5 text-sm">
        <div>
          <span className="font-bold">{totalPoints}</span>{' '}
          <span className="text-muted-foreground">pts</span>
        </div>
        <div className="text-green-600 dark:text-green-400">
          <span className="font-bold">{hits}</span> hits
        </div>
        <div className="text-red-500">
          <span className="font-bold">{busts}</span> busts
        </div>
      </div>

      {/* Picks table */}
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem_4rem_4rem] gap-1 border-b bg-sb-turf/50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <div>#</div>
          <div>Match</div>
          <div className="text-center">Guess</div>
          <div className="text-center">Actual</div>
          <div className="text-center">Result</div>
          <div className="text-right">Pts</div>
        </div>

        {picks.map((pick) => {
          const result = getResultIcon(pick);
          return (
            <div
              key={pick.matchId}
              className={cn(
                'grid grid-cols-[2.5rem_1fr_4rem_4rem_4rem_4rem] gap-1 border-b px-3 py-2.5 text-sm last:border-b-0',
                pick.isBust === true && 'bg-red-500/5',
                pick.isBust === false && pick.matchStatus === 'resolved' && 'bg-green-500/5'
              )}
            >
              <div className="flex items-center text-xs text-muted-foreground">
                {pick.matchNumber}
              </div>
              <div className="flex items-center truncate text-xs font-medium">
                {pick.homeTeam} vs {pick.awayTeam}
              </div>
              <div className="flex items-center justify-center font-bold tabular-nums">
                {pick.guess ?? '—'}
              </div>
              <div className="flex items-center justify-center tabular-nums text-muted-foreground">
                {pick.actualBoundaries ?? '—'}
              </div>
              <div className="flex items-center justify-center gap-1" title={result.label}>
                {result.icon}
              </div>
              <div
                className={cn(
                  'flex items-center justify-end font-bold tabular-nums',
                  pick.isBust === true && 'text-red-500',
                  pick.isBust === false &&
                    pick.matchStatus === 'resolved' &&
                    'text-green-600 dark:text-green-400'
                )}
              >
                {pick.matchStatus === 'resolved' && pick.guess != null
                  ? `+${pick.pointsScored ?? 0}`
                  : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
