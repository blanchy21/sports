'use client';

import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import type { MatchEvent } from '@/types/sports';

interface MatchEventsTimelineProps {
  events: MatchEvent[];
  homeTeam?: string;
  awayTeam?: string;
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  switch (type) {
    case 'goal':
      return <span className="text-lg leading-none">&#9917;</span>;
    case 'yellowCard':
      return <div className="h-4 w-3 rounded-[1px] bg-yellow-400" />;
    case 'redCard':
      return <div className="h-4 w-3 rounded-[1px] bg-red-500" />;
    case 'substitution':
      return <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />;
  }
}

function EventDetail({ event }: { event: MatchEvent }) {
  switch (event.type) {
    case 'goal': {
      const tags: string[] = [];
      if (event.isPenalty) tags.push('pen');
      if (event.isOwnGoal) tags.push('OG');
      const suffix = tags.length > 0 ? ` (${tags.join(', ')})` : '';
      return (
        <div>
          <p className="text-sm font-semibold text-foreground">
            {event.playerName}
            {suffix}
          </p>
          {event.assistName && (
            <p className="text-xs text-muted-foreground">Assist: {event.assistName}</p>
          )}
        </div>
      );
    }
    case 'substitution':
      return (
        <div>
          <p className="text-sm text-foreground">
            <span className="text-red-400">{event.playerName}</span>
            <span className="mx-1.5 text-muted-foreground">&harr;</span>
            <span className="text-green-400">{event.replacedBy}</span>
          </p>
        </div>
      );
    default:
      return <p className="text-sm text-foreground">{event.playerName}</p>;
  }
}

export function MatchEventsTimeline({ events, homeTeam, awayTeam }: MatchEventsTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">No match events yet</div>
    );
  }

  return (
    <div className="relative">
      {/* Team header labels */}
      {(homeTeam || awayTeam) && (
        <div className="mb-4 flex items-center justify-between px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>{homeTeam ?? 'Home'}</span>
          <span>{awayTeam ?? 'Away'}</span>
        </div>
      )}

      {/* Central timeline line */}
      <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-border" />

      <div className="space-y-3">
        {events.map((event, idx) => {
          const isHome = event.team === 'home';
          const isGoal = event.type === 'goal';

          return (
            <div
              key={`${event.type}-${event.clock}-${event.playerName}-${idx}`}
              className={cn(
                'relative flex items-start gap-3',
                isHome ? 'flex-row pr-[calc(50%+1rem)]' : 'flex-row-reverse pl-[calc(50%+1rem)]'
              )}
            >
              {/* Event content */}
              <div
                className={cn(
                  'flex min-w-0 flex-1 items-start gap-2.5',
                  isHome ? 'flex-row' : 'flex-row-reverse'
                )}
              >
                <div className={cn('min-w-0 flex-1', !isHome && 'text-right')}>
                  <EventDetail event={event} />
                </div>
                <div
                  className={cn(
                    'flex shrink-0 items-center gap-1.5',
                    isHome ? 'flex-row' : 'flex-row-reverse'
                  )}
                >
                  <div className="flex h-6 w-6 items-center justify-center">
                    <EventIcon type={event.type} />
                  </div>
                </div>
              </div>

              {/* Minute badge on the center line */}
              <div
                className={cn(
                  'absolute left-1/2 -translate-x-1/2',
                  'flex h-7 min-w-7 items-center justify-center rounded-full px-1.5',
                  isGoal ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  'text-xs font-bold tabular-nums'
                )}
              >
                {event.clock}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
