'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContestStatusBadge } from '@/components/contests/ContestStatusBadge';
import { ContestLeaderboard } from '@/components/contests/ContestLeaderboard';
import { ContestMatchSchedule } from '@/components/contests/ContestMatchSchedule';
import { ContestEntryForm } from '@/components/contests/ContestEntryForm';
import { ContestCountdown } from '@/components/contests/ContestCountdown';
import { ContestInterestButton } from '@/components/contests/ContestInterestButton';
import { useContest } from '@/lib/react-query/queries/useContests';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Users, Coins, ArrowLeft, Info, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { CONTEST_CONFIG, CONTEST_TYPES, PRIZE_MODELS } from '@/lib/contests/constants';
import { cn } from '@/lib/utils/client';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

type Tab = 'overview' | 'leaderboard' | 'matches';

export default function ContestDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: contest, isLoading, error } = useContest(slug);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showEntryForm, setShowEntryForm] = useState(false);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="mb-4 h-8 w-48 animate-pulse rounded bg-sb-turf/50" />
          <div className="h-40 animate-pulse rounded-lg bg-sb-turf/50" />
        </div>
      </MainLayout>
    );
  }

  if (error || !contest) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl px-4 py-8 text-center">
          <p className="text-muted-foreground">Contest not found.</p>
          <Link
            href="/contests"
            className="mt-2 inline-block text-sm text-amber-500 hover:underline"
          >
            Back to contests
          </Link>
        </div>
      </MainLayout>
    );
  }

  const hasEntered = !!contest.userEntry;
  const isComingSoon =
    contest.status === 'REGISTRATION' && new Date(contest.registrationOpens).getTime() > Date.now();
  const canEnter = contest.status === 'REGISTRATION' && !isComingSoon && !hasEntered && !!user;
  const isFixed = contest.prizeModel === PRIZE_MODELS.FIXED;
  const prizeNet = isFixed
    ? contest.prizePool
    : contest.prizePool * (1 - contest.platformFeePct - contest.creatorFeePct);
  const prizeHive = (contest.typeConfig as { prizeHive?: number } | null)?.prizeHive;

  const showMatches = contest.contestType === CONTEST_TYPES.WORLD_CUP_FANTASY;
  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'Overview', icon: Info },
    { key: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
    ...(showMatches ? [{ key: 'matches' as Tab, label: 'Matches', icon: Calendar }] : []),
  ];

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* Back link */}
        <Link
          href="/contests"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-sb-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Contests
        </Link>

        {/* Cover image */}
        {contest.coverImage && (
          <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl">
            <Image
              src={contest.coverImage}
              alt={contest.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 700px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          </div>
        )}

        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{contest.title}</h1>
              <p className="text-xs text-muted-foreground">
                Created by{' '}
                <Link
                  href={`/user/${contest.creatorUsername}`}
                  className="font-medium text-sb-text-primary transition-colors hover:text-amber-500"
                >
                  @{contest.creatorUsername}
                </Link>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{contest.description}</p>
            </div>
          </div>
          <ContestStatusBadge status={contest.status} comingSoon={isComingSoon} />
        </div>

        {/* Coming Soon — countdown + interest */}
        {isComingSoon && (
          <div className="mb-4 space-y-3">
            <ContestCountdown targetDate={contest.registrationOpens} />
            <ContestInterestButton
              slug={slug}
              isInterested={!!contest.isInterested}
              interestCount={contest.interestCount}
            />
          </div>
        )}

        {/* Prize summary */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-amber-500/5 p-3 text-center">
            <Coins className="mx-auto mb-1 h-4 w-4 text-amber-500" />
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {prizeHive
                ? `${prizeHive} HIVE`
                : (prizeNet * CONTEST_CONFIG.PRIZE_SPLIT.FIRST).toFixed(0)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {prizeHive ? '+ MEDALS prizes' : '1st Prize MEDALS'}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <Users className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <div className="text-lg font-bold">{contest.entryCount}</div>
            <div className="text-[10px] text-muted-foreground">Entries</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <Trophy className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <div className="text-lg font-bold">
              {prizeHive ? `${prizeHive} HIVE` : contest.prizePool.toFixed(0)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {prizeHive
                ? `+ ${contest.prizePool.toFixed(0)} MEDALS`
                : isFixed
                  ? 'Guaranteed Pool'
                  : 'Total Pool'}
            </div>
          </div>
        </div>

        {/* User entry status */}
        {hasEntered && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">
            <span className="font-medium text-green-600 dark:text-green-400">
              You&apos;re entered!
            </span>
            {contest.userEntry?.rank && (
              <span className="ml-2 text-muted-foreground">
                Current rank: #{contest.userEntry.rank} ({contest.userEntry.totalScore} pts)
              </span>
            )}
          </div>
        )}

        {/* Enter CTA */}
        {canEnter && !showEntryForm && (
          <Button
            onClick={() => setShowEntryForm(true)}
            className="mb-4 w-full bg-amber-500 text-white hover:bg-amber-600"
            size="lg"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Enter Contest {contest.entryFee > 0 ? `(${contest.entryFee} MEDALS)` : '(Free)'}
          </Button>
        )}

        {/* Entry form */}
        {showEntryForm && canEnter && (
          <div className="mb-4 rounded-lg border p-4">
            <ContestEntryForm contest={contest} />
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeTab === key
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-sb-text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {contest.rules && (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{contest.rules}</ReactMarkdown>
              </div>
            )}
            <div className="rounded-lg border p-3">
              <h3 className="mb-2 text-sm font-semibold">Prize Distribution</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1st Place (60%)</span>
                  <span className="font-medium">{(prizeNet * 0.6).toFixed(0)} MEDALS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">2nd Place (25%)</span>
                  <span className="font-medium">{(prizeNet * 0.25).toFixed(0)} MEDALS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">3rd Place (15%)</span>
                  <span className="font-medium">{(prizeNet * 0.15).toFixed(0)} MEDALS</span>
                </div>
                {isFixed ? (
                  <>
                    <hr className="my-2" />
                    <div className="text-xs text-muted-foreground">
                      {prizeHive
                        ? `Prizes funded by SportsBlock: ${prizeHive} HIVE + ${contest.prizePool.toFixed(0)} MEDALS split across 1st, 2nd & 3rd.`
                        : 'Entry fees are burned. Prizes are guaranteed by the sponsor.'}
                    </div>
                  </>
                ) : contest.entryFee > 0 ? (
                  <>
                    <hr className="my-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Platform Fee ({(contest.platformFeePct * 100).toFixed(0)}%)</span>
                      <span>{(contest.prizePool * contest.platformFeePct).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Creator Fee ({(contest.creatorFeePct * 100).toFixed(0)}%)</span>
                      <span>{(contest.prizePool * contest.creatorFeePct).toFixed(0)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <hr className="my-2" />
                    <div className="text-xs text-muted-foreground">
                      Free entry. No fees deducted.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && <ContestLeaderboard slug={slug} />}
        {activeTab === 'matches' && <ContestMatchSchedule slug={slug} />}
      </div>
    </MainLayout>
  );
}
