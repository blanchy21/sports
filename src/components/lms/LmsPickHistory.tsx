'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock, RotateCcw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import type { LmsPickResult } from '@/lib/lms/types';

interface PickHistoryEntry {
  gameweek: number;
  teamPicked: string;
  isAutoPick: boolean;
  result: LmsPickResult;
}

interface LmsPickHistoryProps {
  history: PickHistoryEntry[];
}

function getResultDisplay(result: LmsPickResult) {
  switch (result) {
    case 'survived':
      return {
        icon: CheckCircle2,
        label: 'Survived',
        className: 'text-green-600 dark:text-green-400',
      };
    case 'eliminated':
      return {
        icon: XCircle,
        label: 'Eliminated',
        className: 'text-red-600 dark:text-red-400',
      };
    case 'pending':
      return {
        icon: Clock,
        label: 'Pending',
        className: 'text-muted-foreground',
      };
    case 'postponed':
      return {
        icon: RotateCcw,
        label: 'Postponed',
        className: 'text-blue-600 dark:text-blue-400',
      };
    default:
      return {
        icon: Clock,
        label: result,
        className: 'text-muted-foreground',
      };
  }
}

export function LmsPickHistory({ history }: LmsPickHistoryProps) {
  if (history.length === 0) return null;

  const sorted = [...history].sort((a, b) => b.gameweek - a.gameweek);

  return (
    <div className="rounded-2xl border bg-sb-stadium p-5">
      <h3 className="mb-4 text-lg font-bold">Pick History</h3>
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-sb-turf/30 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="w-16 px-4 py-3">GW</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-center">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sb-border/50">
            {sorted.map((pick) => {
              const result = getResultDisplay(pick.result);
              const Icon = result.icon;
              return (
                <tr key={pick.gameweek}>
                  <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    {pick.gameweek}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{pick.teamPicked}</span>
                      {pick.isAutoPick && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-sb-turf px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <Zap className="h-2.5 w-2.5" />
                          Auto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-semibold',
                        result.className
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {result.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
