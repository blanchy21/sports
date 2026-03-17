'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Users, Clock, ChevronRight, Shield } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import type { LmsCompetitionResponse } from '@/lib/lms/types';

function getTimeRemaining(dateStr: string): { text: string; urgent: boolean } | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return { text: `${days}d ${hours}h remaining`, urgent: days <= 1 };
  if (hours > 0) return { text: `${hours}h ${mins}m remaining`, urgent: hours <= 6 };
  return { text: `${mins}m remaining`, urgent: true };
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'open':
      return {
        label: 'OPEN',
        className: 'bg-green-500/10 text-green-600 dark:text-green-400 ring-green-500/20',
      };
    case 'picking':
      return {
        label: 'PICKS OPEN',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
      };
    case 'locked':
      return {
        label: 'LOCKED',
        className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20',
      };
    case 'results':
      return {
        label: 'RESULTS',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20',
      };
    case 'complete':
      return {
        label: 'ENDED',
        className: 'bg-sb-turf text-muted-foreground ring-border',
      };
    default:
      return {
        label: status.toUpperCase(),
        className: 'bg-sb-turf text-muted-foreground ring-border',
      };
  }
}

function getCTA(status: string): string {
  switch (status) {
    case 'open':
      return 'Enter Free';
    case 'picking':
      return 'Make Your Pick';
    default:
      return 'View Standings';
  }
}

export const LmsCompetitionCard = React.memo(function LmsCompetitionCard({
  competition,
}: {
  competition: LmsCompetitionResponse;
}) {
  const statusBadge = useMemo(() => getStatusBadge(competition.status), [competition.status]);
  const cta = useMemo(() => getCTA(competition.status), [competition.status]);

  const deadline = competition.currentGameweekData?.deadline;
  const timeInfo = useMemo(() => (deadline ? getTimeRemaining(deadline) : null), [deadline]);

  const aliveCount = competition.aliveCount ?? 0;

  return (
    <Link href="/contests/last-man-standing" className="group block">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-sb-stadium transition-all duration-300',
          'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5',
          (competition.status === 'open' || competition.status === 'picking') &&
            'border-amber-500/20 hover:border-amber-500/40',
          competition.status !== 'open' &&
            competition.status !== 'picking' &&
            'hover:border-sb-border'
        )}
      >
        {/* Cover image */}
        <div className="relative h-44 w-full overflow-hidden">
          <Image
            src="/sports/lms-football-unsplash.jpg"
            alt="Last Man Standing"
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 700px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

          {/* Status badge */}
          <div className="absolute right-3 top-3">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1',
                statusBadge.className
              )}
            >
              {statusBadge.label}
            </span>
          </div>

          {/* FREE ENTRY badge */}
          {competition.isFreeEntry && (
            <div className="absolute left-3 top-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-green-500/30">
                <Shield className="h-3 w-3" />
                FREE ENTRY
              </span>
            </div>
          )}
        </div>

        {/* Title + prize section */}
        <div className="relative z-10 -mt-10 px-5 pb-4">
          <div className="mb-4">
            <h3 className="line-clamp-2 text-lg font-bold leading-tight transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
              {competition.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{competition.season} Season</p>
          </div>

          {/* Prize section */}
          <div className="relative flex items-center gap-4 rounded-xl border border-amber-500/10 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4">
            <div className="flex-shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 ring-1 ring-amber-500/20">
                <Trophy className="h-7 w-7 text-amber-500" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400/80">
                Winner Takes All
              </div>
              <div className="text-2xl font-extrabold leading-none text-amber-600 dark:text-amber-400">
                {competition.prizeHive > 0 && (
                  <>
                    {competition.prizeHive}{' '}
                    <span className="text-sm font-semibold opacity-70">HIVE</span>
                  </>
                )}
                {competition.prizeHive > 0 && competition.prizeMedals > 0 && (
                  <span className="text-sm font-semibold opacity-50"> + </span>
                )}
                {competition.prizeMedals > 0 && (
                  <>
                    {competition.prizeMedals.toLocaleString()}{' '}
                    <span className="text-sm font-semibold opacity-70">MEDALS</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-px border-t border-sb-border/50 bg-border/50">
          <div className="flex items-center gap-3 bg-sb-stadium px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sb-turf/80">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Alive
              </div>
              <div className="text-sm font-bold leading-tight">
                {aliveCount}
                <span className="text-xs font-normal text-muted-foreground">
                  {' '}
                  / {competition.totalEntries}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-sb-stadium px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sb-turf/80">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Gameweek
              </div>
              <div className="text-sm font-bold leading-tight">GW{competition.currentGameweek}</div>
            </div>
          </div>
        </div>

        {/* Footer - countdown / CTA */}
        <div className="border-t border-sb-border/50 bg-sb-stadium">
          <div className="flex items-center justify-between px-5 py-3">
            {timeInfo ? (
              <div
                className={cn(
                  'flex items-center gap-1.5 text-sm',
                  timeInfo.urgent ? 'font-semibold text-orange-500' : 'text-muted-foreground'
                )}
              >
                <Clock className={cn('h-4 w-4', timeInfo.urgent && 'animate-pulse')} />
                {timeInfo.text}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {competition.status === 'complete' ? 'Competition ended' : 'In progress'}
              </div>
            )}
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-600 transition-all group-hover:gap-2 dark:text-amber-400">
              {cta}
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});
