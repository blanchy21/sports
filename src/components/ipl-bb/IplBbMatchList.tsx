'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import { IPL_TEAMS } from '@/lib/ipl-bb/utils';
import type { IplBbMatchDetail } from '@/lib/ipl-bb/types';

function getMatchStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return { label: 'Open', className: 'bg-green-500/10 text-green-600 dark:text-green-400' };
    case 'upcoming':
      return { label: 'Upcoming', className: 'bg-sb-turf text-muted-foreground' };
    case 'locked':
      return {
        label: 'Locked',
        className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      };
    case 'resolved':
      return { label: 'Resolved', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' };
    case 'abandoned':
      return { label: 'Abandoned', className: 'bg-red-500/10 text-red-500' };
    default:
      return { label: status, className: 'bg-sb-turf text-muted-foreground' };
  }
}

interface IplBbMatchListProps {
  matches: IplBbMatchDetail[];
}

export const IplBbMatchList = React.memo(function IplBbMatchList({ matches }: IplBbMatchListProps) {
  return (
    <div className="space-y-2">
      {matches.map((match) => {
        const badge = getMatchStatusBadge(match.status);
        const kickoff = new Date(match.kickoffTime);
        const dateStr = kickoff.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        const timeStr = kickoff.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const home = IPL_TEAMS[match.homeTeam];
        const away = IPL_TEAMS[match.awayTeam];

        return (
          <div
            key={match.id}
            className="flex items-center gap-3 rounded-lg border bg-sb-stadium px-4 py-3"
          >
            <span className="w-6 text-center text-xs font-medium text-muted-foreground">
              {match.matchNumber}
            </span>

            <div className="flex flex-1 items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: home?.color ?? '#666' }}
              />
              <span className="font-medium">{match.homeTeam}</span>
              <span className="text-muted-foreground">vs</span>
              <span className="font-medium">{match.awayTeam}</span>
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: away?.color ?? '#666' }}
              />
            </div>

            <div className="hidden text-right text-xs text-muted-foreground sm:block">
              <div>{dateStr}</div>
              <div>{timeStr}</div>
            </div>

            {match.status === 'resolved' && match.actualBoundaries != null && (
              <div className="text-right">
                <div className="text-sm font-bold">{match.actualBoundaries}</div>
                <div className="text-[10px] text-muted-foreground">boundaries</div>
              </div>
            )}

            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>
        );
      })}
    </div>
  );
});
