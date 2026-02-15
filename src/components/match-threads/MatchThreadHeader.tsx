'use client';

import React from 'react';
import { MapPin, Clock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { SportsEvent } from '@/types/sports';

function formatKickoffTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface MatchThreadHeaderProps {
  event: SportsEvent;
  isLive: boolean;
  isOpen: boolean;
}

export function MatchThreadHeader({ event, isLive, isOpen }: MatchThreadHeaderProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-6', isLive && 'border-green-500/50')}>
      {/* Sport + League */}
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-lg">{event.icon}</span>
        <span className="font-medium">{event.sport}</span>
        {event.league && (
          <>
            <span className="text-muted-foreground/50">&middot;</span>
            <span>{event.league}</span>
          </>
        )}

        <div className="flex-1" />

        {isLive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-600 dark:text-green-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            LIVE
          </span>
        )}
        {!isOpen && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Read Only
          </span>
        )}
      </div>

      {/* Teams */}
      {event.teams ? (
        <h1 className="mb-4 text-2xl font-bold sm:text-3xl">
          {event.teams.home} <span className="text-muted-foreground">vs</span> {event.teams.away}
        </h1>
      ) : (
        <h1 className="mb-4 text-2xl font-bold sm:text-3xl">{event.name}</h1>
      )}

      {/* Details */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {event.venue && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {event.venue}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {formatKickoffTime(event.date)}
        </span>
      </div>
    </div>
  );
}
