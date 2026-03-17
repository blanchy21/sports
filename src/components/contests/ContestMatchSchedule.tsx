'use client';

import React from 'react';
import { useContestMatches } from '@/lib/react-query/queries/useContests';
import { WORLD_CUP_CONFIG } from '@/lib/contests/constants';
import { cn } from '@/lib/utils/client';

const ROUND_LABELS: Record<string, string> = {
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-Finals',
  semi_final: 'Semi-Finals',
  third_place: '3rd Place',
  final: 'Final',
};

export function ContestMatchSchedule({ slug }: { slug: string }) {
  const { data: matches, isLoading } = useContestMatches(slug);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-sb-turf/50" />
        ))}
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return <p className="text-sm text-muted-foreground">No matches scheduled yet.</p>;
  }

  // Group matches by round
  const grouped = new Map<string, typeof matches>();
  for (const match of matches) {
    const group = grouped.get(match.round) || [];
    group.push(match);
    grouped.set(match.round, group);
  }

  // Sort rounds in tournament order
  const sortedRounds = [...grouped.keys()].sort((a, b) => {
    const aIdx = WORLD_CUP_CONFIG.ROUNDS.indexOf(a as (typeof WORLD_CUP_CONFIG.ROUNDS)[number]);
    const bIdx = WORLD_CUP_CONFIG.ROUNDS.indexOf(b as (typeof WORLD_CUP_CONFIG.ROUNDS)[number]);
    return aIdx - bIdx;
  });

  return (
    <div className="space-y-6">
      {sortedRounds.map((round) => {
        const roundMatches = grouped.get(round) || [];
        return (
          <div key={round}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {ROUND_LABELS[round] || round}
            </h3>
            <div className="space-y-1">
              {roundMatches.map((match) => {
                const hasResult = match.homeScore !== null;
                return (
                  <div
                    key={match.id}
                    className={cn(
                      'grid grid-cols-[1fr_60px_1fr] items-center gap-2 rounded-lg px-3 py-2 text-sm',
                      hasResult ? 'bg-sb-turf/30' : 'bg-sb-turf/10'
                    )}
                  >
                    <span className="truncate text-right font-medium">{match.homeTeamCode}</span>
                    <span className="text-center font-mono font-bold">
                      {hasResult ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
                    </span>
                    <span className="truncate font-medium">{match.awayTeamCode}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
