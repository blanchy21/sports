'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { MatchThread } from '@/types/sports';

function formatRelativeTime(dateStr: string, isLive: boolean): string {
  if (isLive) return 'Live';

  const eventTime = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = eventTime - now;
  const absDiffMs = Math.abs(diffMs);

  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMs > 0) {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days}d`;
    }
    if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
    return `Starts in ${minutes}m`;
  }

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

interface MatchThreadCardProps {
  thread: MatchThread;
}

export function MatchThreadCard({ thread }: MatchThreadCardProps) {
  const { event, biteCount, isOpen, isLive } = thread;

  return (
    <Link
      href={`/match-threads/${thread.eventId}`}
      className={cn(
        'block rounded-xl border bg-card p-4 transition-all hover:shadow-md',
        isLive && 'border-green-500/50 shadow-sm shadow-green-500/10'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Sport + League */}
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{event.icon}</span>
            <span>{event.sport}</span>
            {event.league && (
              <>
                <span className="text-muted-foreground/50">&middot;</span>
                <span className="truncate">{event.league}</span>
              </>
            )}
          </div>

          {/* Teams */}
          {event.teams ? (
            <div className="mb-2">
              <h3 className="text-lg font-semibold leading-tight">
                {event.teams.home} <span className="text-muted-foreground">vs</span>{' '}
                {event.teams.away}
              </h3>
            </div>
          ) : (
            <h3 className="mb-2 text-lg font-semibold leading-tight">{event.name}</h3>
          )}

          {/* Kickoff time + bite count */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{formatRelativeTime(event.date, isLive)}</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {biteCount}
            </span>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex flex-col items-end gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              LIVE
            </span>
          )}
          {!isOpen && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Lock className="h-3 w-3" />
              Read Only
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
