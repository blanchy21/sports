'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Users, Coins, Clock, ChevronRight, Flame, Heart } from 'lucide-react';
import { ContestStatusBadge } from './ContestStatusBadge';
import { ContestCountdown } from './ContestCountdown';
import { cn } from '@/lib/utils/client';
import type { ContestResponse } from '@/lib/contests/types';
import { CONTEST_CONFIG } from '@/lib/contests/constants';

function formatPrizeAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toFixed(0);
}

function getTimeRemaining(dateStr: string): { text: string; urgent: boolean } {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return { text: 'Closed', urgent: false };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return { text: `${days}d ${hours}h remaining`, urgent: days <= 1 };
  if (hours > 0) return { text: `${hours}h ${mins}m remaining`, urgent: hours <= 6 };
  return { text: `${mins}m remaining`, urgent: true };
}

function getCapacityPercent(entryCount: number, maxEntries: number | null): number | null {
  if (!maxEntries) return null;
  return Math.min(100, Math.round((entryCount / maxEntries) * 100));
}

export const ContestCard = React.memo(function ContestCard({
  contest,
}: {
  contest: ContestResponse;
}) {
  const prizeNet = contest.prizePool * (1 - contest.platformFeePct - contest.creatorFeePct);
  const firstPrize = prizeNet * CONTEST_CONFIG.PRIZE_SPLIT.FIRST;
  const secondPrize = prizeNet * CONTEST_CONFIG.PRIZE_SPLIT.SECOND;
  const thirdPrize = prizeNet * CONTEST_CONFIG.PRIZE_SPLIT.THIRD;

  const isRegistration = contest.status === 'REGISTRATION';
  const isComingSoon = isRegistration && new Date(contest.registrationOpens).getTime() > Date.now();
  const isActive = contest.status === 'ACTIVE';
  const isSettled = contest.status === 'SETTLED';
  const timeInfo =
    isRegistration && !isComingSoon ? getTimeRemaining(contest.registrationCloses) : null;
  const capacityPct = getCapacityPercent(contest.entryCount, contest.maxEntries);
  const isAlmostFull = capacityPct !== null && capacityPct >= 80;

  return (
    <Link href={`/contests/${contest.slug}`} className="group block">
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-card transition-all duration-300',
          'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5',
          isRegistration && 'border-amber-500/20 hover:border-amber-500/40',
          isActive && 'border-amber-500/30',
          !isRegistration && !isActive && 'hover:border-border'
        )}
      >
        {/* ----------------------------------------------------------------- */}
        {/* Cover image                                                       */}
        {/* ----------------------------------------------------------------- */}
        {contest.coverImage && (
          <div className="relative h-44 w-full overflow-hidden">
            <Image
              src={contest.coverImage}
              alt={contest.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 700px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <div className="absolute right-3 top-3">
              <ContestStatusBadge status={contest.status} comingSoon={isComingSoon} />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Top visual band - gradient background with trophy                 */}
        {/* ----------------------------------------------------------------- */}
        <div className={cn('relative px-5 pb-4', contest.coverImage ? '-mt-10 pt-0' : 'pt-5')}>
          {/* Background gradient layer (only when no image) */}
          {!contest.coverImage && (
            <div
              className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 80% 20%, rgba(245,158,11,0.15), transparent)',
              }}
            />
          )}

          {/* Title + creator */}
          <div
            className={cn(
              'relative mb-4 flex items-start justify-between gap-3',
              contest.coverImage && 'z-10'
            )}
          >
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-lg font-bold leading-tight transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                {contest.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Created by{' '}
                <span className="font-medium text-foreground">@{contest.creatorUsername}</span>
              </p>
              {contest.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {contest.description}
                </p>
              )}
            </div>
            {!contest.coverImage && (
              <div className="flex-shrink-0 pt-0.5">
                <ContestStatusBadge status={contest.status} comingSoon={isComingSoon} />
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* Prize pool hero section                                           */}
          {/* ----------------------------------------------------------------- */}
          <div className="relative flex items-center gap-4 rounded-xl border border-amber-500/10 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4">
            {/* Trophy icon */}
            <div className="flex-shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 ring-1 ring-amber-500/20">
                <Trophy className="h-7 w-7 text-amber-500" />
              </div>
            </div>

            {/* Prize breakdown */}
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400/80">
                Total Prize Pool
              </div>
              <div className="text-2xl font-extrabold leading-none text-amber-600 dark:text-amber-400">
                {formatPrizeAmount(contest.prizePool)}{' '}
                <span className="text-sm font-semibold opacity-70">MEDALS</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  1st{' '}
                  <span className="font-semibold text-foreground">
                    {formatPrizeAmount(firstPrize)}
                  </span>
                </span>
                <span className="text-border">|</span>
                <span>
                  2nd{' '}
                  <span className="font-semibold text-foreground">
                    {formatPrizeAmount(secondPrize)}
                  </span>
                </span>
                <span className="text-border">|</span>
                <span>
                  3rd{' '}
                  <span className="font-semibold text-foreground">
                    {formatPrizeAmount(thirdPrize)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Stats bar                                                         */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-px border-t border-border/50 bg-border/50">
          {/* Entry Fee */}
          <div className="flex items-center gap-3 bg-card px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/80">
              <Coins className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Entry Fee
              </div>
              <div className="text-sm font-bold leading-tight">
                {contest.entryFee}{' '}
                <span className="text-xs font-normal text-muted-foreground">MEDALS</span>
              </div>
            </div>
          </div>

          {/* Entries */}
          <div className="flex items-center gap-3 bg-card px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/80">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Entries
              </div>
              <div className="text-sm font-bold leading-tight">
                {contest.entryCount}
                {contest.maxEntries && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {' '}
                    / {contest.maxEntries}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Capacity bar (if max entries set)                                 */}
        {/* ----------------------------------------------------------------- */}
        {capacityPct !== null && (
          <div className="border-t border-border/50 bg-card px-5 py-2">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {isAlmostFull ? (
                  <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                    <Flame className="h-3 w-3" />
                    Filling fast
                  </span>
                ) : (
                  'Spots available'
                )}
              </span>
              <span className="font-medium text-muted-foreground">{capacityPct}% full</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isAlmostFull ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-amber-500/60'
                )}
                style={{ width: `${capacityPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Footer - countdown / CTA                                          */}
        {/* ----------------------------------------------------------------- */}
        <div className="border-t border-border/50 bg-card">
          {isComingSoon ? (
            <div className="flex items-center justify-between px-5 py-3">
              <ContestCountdown targetDate={contest.registrationOpens} compact />
              {contest.interestCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3" />
                  {contest.interestCount} interested
                </span>
              )}
            </div>
          ) : isRegistration && timeInfo ? (
            <div className="flex items-center justify-between px-5 py-3">
              <div
                className={cn(
                  'flex items-center gap-1.5 text-sm',
                  timeInfo.urgent ? 'font-semibold text-orange-500' : 'text-muted-foreground'
                )}
              >
                <Clock className={cn('h-4 w-4', timeInfo.urgent && 'animate-pulse')} />
                {timeInfo.text}
              </div>
              <span className="flex items-center gap-1 text-sm font-semibold text-amber-600 transition-all group-hover:gap-2 dark:text-amber-400">
                Enter Now
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          ) : isActive ? (
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                Competition in progress
              </div>
              <span className="flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-all group-hover:gap-2 group-hover:text-foreground">
                View
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          ) : isSettled ? (
            <div className="flex items-center justify-between px-5 py-3">
              <div className="text-sm text-muted-foreground">Competition ended</div>
              <span className="flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-all group-hover:gap-2 group-hover:text-foreground">
                Results
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center px-5 py-3">
              <span className="flex items-center gap-1 text-sm text-muted-foreground transition-all group-hover:gap-2 group-hover:text-foreground">
                View Details
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});
