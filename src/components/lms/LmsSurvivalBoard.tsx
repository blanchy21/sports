'use client';

import React, { useMemo } from 'react';
import { Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import type { LmsBoardEntry } from '@/lib/lms/types';

interface LmsSurvivalBoardProps {
  entries: LmsBoardEntry[];
  isDeadlinePassed: boolean;
}

function getStatusIndicator(status: string) {
  switch (status) {
    case 'alive':
      return {
        dot: 'bg-green-500',
        label: 'Alive',
        labelClass: 'text-green-600 dark:text-green-400',
      };
    case 'eliminated':
      return {
        dot: 'bg-red-500',
        label: 'Out',
        labelClass: 'text-red-600 dark:text-red-400',
      };
    case 'winner':
      return {
        dot: null,
        label: 'Winner',
        labelClass: 'text-amber-600 dark:text-amber-400',
      };
    default:
      return {
        dot: 'bg-muted-foreground',
        label: status,
        labelClass: 'text-muted-foreground',
      };
  }
}

export function LmsSurvivalBoard({ entries, isDeadlinePassed }: LmsSurvivalBoardProps) {
  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      // Winners first
      if (a.status === 'winner' && b.status !== 'winner') return -1;
      if (b.status === 'winner' && a.status !== 'winner') return 1;
      // Alive before eliminated
      if (a.status === 'alive' && b.status !== 'alive') return -1;
      if (b.status === 'alive' && a.status !== 'alive') return 1;
      // By gameweeks survived desc
      return b.gameweeksSurvived - a.gameweeksSurvived;
    });
  }, [entries]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sb-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No entries yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-bold">Survival Board</h3>
      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-sb-turf/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">This Week</th>
                <th className="px-4 py-3 text-center">GWs Survived</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sb-border/50">
              {sorted.map((entry, i) => {
                const status = getStatusIndicator(entry.status);
                return (
                  <tr
                    key={entry.username}
                    className={cn(
                      'transition-colors',
                      entry.status === 'eliminated' && 'opacity-60'
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold">@{entry.username}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-semibold',
                          status.labelClass
                        )}
                      >
                        {entry.status === 'winner' ? (
                          <Trophy className="h-3.5 w-3.5" />
                        ) : (
                          status.dot && (
                            <span className={cn('inline-block h-2 w-2 rounded-full', status.dot)} />
                          )
                        )}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {entry.currentPick ? (
                        <span className="font-medium">{entry.currentPick}</span>
                      ) : entry.hasPicked && !isDeadlinePassed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      ) : entry.status === 'eliminated' ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No pick</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold">
                      {entry.gameweeksSurvived}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
