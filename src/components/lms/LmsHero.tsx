'use client';

import React, { useMemo } from 'react';
import { Trophy, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { Button } from '@/components/core/Button';
import type { LmsCompetitionResponse } from '@/lib/lms/types';

function getTimeRemaining(dateStr: string): { text: string; urgent: boolean } | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return { text: `${days}d ${hours}h`, urgent: days <= 1 };
  if (hours > 0) return { text: `${hours}h ${mins}m`, urgent: hours <= 6 };
  return { text: `${mins}m`, urgent: true };
}

function getStatusInfo(status: string): { label: string; className: string } {
  switch (status) {
    case 'open':
      return { label: 'Registration Open', className: 'text-green-600 dark:text-green-400' };
    case 'picking':
      return { label: 'Picks Open', className: 'text-amber-600 dark:text-amber-400' };
    case 'locked':
      return { label: 'Gameweek Locked', className: 'text-orange-600 dark:text-orange-400' };
    case 'results':
      return { label: 'Results Pending', className: 'text-blue-600 dark:text-blue-400' };
    case 'complete':
      return { label: 'Competition Ended', className: 'text-muted-foreground' };
    default:
      return { label: status, className: 'text-muted-foreground' };
  }
}

interface LmsHeroProps {
  competition: LmsCompetitionResponse;
  isEntered: boolean;
  isAlive: boolean;
  onJoin: () => void;
  joining: boolean;
}

export function LmsHero({ competition, isEntered, isAlive, onJoin, joining }: LmsHeroProps) {
  const deadline = competition.currentGameweekData?.deadline;
  const timeInfo = useMemo(() => (deadline ? getTimeRemaining(deadline) : null), [deadline]);
  const statusInfo = useMemo(() => getStatusInfo(competition.status), [competition.status]);

  const isRegistrationOpen =
    (competition.status === 'open' || competition.status === 'picking') &&
    competition.currentGameweek <= competition.startGameweek;
  const showJoinButton = !isEntered && isRegistrationOpen;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-sb-stadium">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 80% 20%, rgba(245,158,11,0.2), transparent)',
        }}
      />

      <div className="relative px-5 py-6 sm:px-8 sm:py-8">
        {/* Top row: status + GW */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className={cn('text-sm font-semibold', statusInfo.className)}>
            {statusInfo.label}
          </span>
          <span className="text-sm text-muted-foreground">
            Gameweek {competition.currentGameweek}
          </span>
          {timeInfo && (
            <span
              className={cn(
                'flex items-center gap-1.5 text-sm',
                timeInfo.urgent ? 'font-semibold text-orange-500' : 'text-muted-foreground'
              )}
            >
              <Clock className={cn('h-3.5 w-3.5', timeInfo.urgent && 'animate-pulse')} />
              {timeInfo.text} until deadline
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{competition.name}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Pick one Premier League team to win each gameweek. Win and you survive. Lose or draw and
          you&apos;re out. Each team can only be used once.
        </p>

        {/* Prize display */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent px-5 py-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400/80">
                Prize Pool
              </div>
              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                {competition.prizeHive > 0 && `${competition.prizeHive} HIVE`}
                {competition.prizeHive > 0 && competition.prizeMedals > 0 && ' + '}
                {competition.prizeMedals > 0 &&
                  `${competition.prizeMedals.toLocaleString()} MEDALS`}
              </div>
            </div>
          </div>

          {competition.isFreeEntry && isRegistrationOpen && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5 text-sm font-bold text-green-600 ring-1 ring-green-500/20 dark:text-green-400">
              <Shield className="h-4 w-4" />
              FREE ENTRY
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="mb-6 flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div>
            <span className="font-bold text-sb-text-primary">{competition.totalEntries}</span>{' '}
            entries
          </div>
          {competition.aliveCount !== undefined && (
            <div>
              <span className="font-bold text-sb-text-primary">{competition.aliveCount}</span> alive
            </div>
          )}
        </div>

        {/* Action area */}
        {showJoinButton && (
          <Button
            onClick={onJoin}
            disabled={joining}
            className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
            size="lg"
          >
            {joining ? 'Joining...' : 'Enter Free'}
          </Button>
        )}

        {isEntered && isAlive && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-2.5 text-sm font-semibold text-green-600 ring-1 ring-green-500/20 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            You&apos;re in! Make your pick below.
          </div>
        )}

        {isEntered && !isAlive && competition.status !== 'complete' && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 ring-1 ring-red-500/20 dark:text-red-400">
            Eliminated - better luck next time!
          </div>
        )}

        {competition.status === 'complete' && competition.winnerUsername && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
            <Trophy className="h-5 w-5" />
            Winner: @{competition.winnerUsername}
          </div>
        )}
      </div>
    </div>
  );
}
