'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, Medal, ChevronDown, ChevronUp } from 'lucide-react';
import { useContestLeaderboard } from '@/lib/react-query/queries/useContests';
import { cn } from '@/lib/utils/client';
import Link from 'next/link';
import type { GolfFantasyPick } from '@/lib/contests/types';

const RANK_STYLES: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-gray-400',
  3: 'text-amber-700',
};

interface GolferInfo {
  name: string;
  odds: number;
  rounds?: Record<string, string>;
  scoreRelToPar?: number;
  position?: number;
  status?: string;
}

export function GolfLeaderboard({ slug }: { slug: string }) {
  const { data, isLoading, error } = useContestLeaderboard(slug);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Parse golfer scores from the API response
  const golferMap = useMemo(() => {
    const map = new Map<string, GolferInfo>();
    const scores = (data as Record<string, unknown>)?.golferScores as
      | Record<string, GolferInfo>
      | undefined;
    if (scores) {
      for (const [code, info] of Object.entries(scores)) {
        map.set(code, info);
      }
    }
    return map;
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-sb-turf/50" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">Failed to load leaderboard.</p>;
  }

  const entries = data?.entries || [];

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Trophy className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">No entries yet. Be the first to enter!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_80px_24px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Rank</span>
        <span>Player</span>
        <span className="text-right">Score</span>
        <span />
      </div>

      {/* Entries */}
      {entries.map((entry) => {
        const entryData = entry.entryData as {
          picks?: GolfFantasyPick[];
          tieBreaker?: number;
        } | null;
        const picks = entryData?.picks || [];
        const isExpanded = expandedUser === entry.username;
        const score = entry.totalScore;
        const scoreDisplay = score === 0 ? 'E' : score > 0 ? `+${score}` : `${score}`;

        return (
          <div key={entry.username}>
            <button
              onClick={() => setExpandedUser(isExpanded ? null : entry.username)}
              className={cn(
                'grid w-full grid-cols-[40px_1fr_80px_24px] items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors',
                entry.rank <= 3 ? 'bg-amber-500/5' : 'hover:bg-sb-turf/50',
                isExpanded && 'bg-sb-turf/50'
              )}
            >
              {/* Rank */}
              <div className="flex items-center justify-center">
                {entry.rank <= 3 ? (
                  <Medal className={cn('h-5 w-5', RANK_STYLES[entry.rank])} />
                ) : (
                  <span className="text-sm text-muted-foreground">{entry.rank}</span>
                )}
              </div>

              {/* Username */}
              <Link
                href={`/user/${entry.username}`}
                className="truncate text-sm font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                @{entry.username}
              </Link>

              {/* Score */}
              <div className="text-right">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    score < 0 && 'text-green-400',
                    score > 0 && 'text-red-400',
                    entry.rank <= 3 && RANK_STYLES[entry.rank]
                  )}
                >
                  {scoreDisplay}
                </span>
              </div>

              {/* Expand arrow */}
              <div className="flex items-center justify-center text-muted-foreground">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>

            {/* Expanded: show picks with round breakdown */}
            {isExpanded && picks.length > 0 && (
              <div className="mb-1 ml-10 mr-3 rounded-lg border bg-sb-turf/20 p-3">
                <div className="mb-2 text-xs text-muted-foreground">
                  Picks (tiebreaker: {entryData?.tieBreaker ?? '-'})
                </div>
                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_40px_40px_40px_40px_50px_40px] gap-1 text-[10px] font-medium text-muted-foreground">
                    <span>Golfer</span>
                    <span className="text-center">R1</span>
                    <span className="text-center">R2</span>
                    <span className="text-center">R3</span>
                    <span className="text-center">R4</span>
                    <span className="text-right">Total</span>
                    <span className="text-center">Pos</span>
                  </div>
                  {picks.map((pick) => {
                    const info = golferMap.get(pick.golferCode);
                    const rounds = info?.rounds || {};
                    const golferScore = info?.scoreRelToPar;
                    const golferScoreDisplay =
                      golferScore === undefined
                        ? '-'
                        : golferScore === 0
                          ? 'E'
                          : golferScore > 0
                            ? `+${golferScore}`
                            : `${golferScore}`;

                    return (
                      <div
                        key={pick.golferCode}
                        className="grid grid-cols-[1fr_40px_40px_40px_40px_50px_40px] items-center gap-1 text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{info?.name || pick.golferCode}</span>
                          {info?.status && info.status !== 'active' && (
                            <span className="rounded bg-red-500/20 px-1 py-0.5 text-[9px] font-medium uppercase text-red-400">
                              {info.status}
                            </span>
                          )}
                        </div>
                        <RoundCell value={rounds['1']} />
                        <RoundCell value={rounds['2']} />
                        <RoundCell value={rounds['3']} />
                        <RoundCell value={rounds['4']} />
                        <div
                          className={cn(
                            'text-right font-semibold',
                            golferScore !== undefined && golferScore < 0 && 'text-green-400',
                            golferScore !== undefined && golferScore > 0 && 'text-red-400'
                          )}
                        >
                          {golferScoreDisplay}
                        </div>
                        <div className="text-center text-muted-foreground">
                          {info?.position ?? '-'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  Combined odds: {picks.reduce((sum, p) => sum + p.odds, 0)}/1
                </div>
              </div>
            )}
          </div>
        );
      })}

      {data?.pagination?.hasMore && (
        <p className="py-2 text-center text-xs text-muted-foreground">
          Showing top {entries.length} of {data.pagination.total}
        </p>
      )}
    </div>
  );
}

function RoundCell({ value }: { value?: string }) {
  if (!value) {
    return <div className="text-center text-muted-foreground">-</div>;
  }
  return (
    <div
      className={cn(
        'text-center font-mono',
        value.startsWith('-') && 'text-green-400',
        value.startsWith('+') && 'text-red-400'
      )}
    >
      {value}
    </div>
  );
}
