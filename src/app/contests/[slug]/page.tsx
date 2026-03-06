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
import { CONTEST_CONFIG, CONTEST_TYPES } from '@/lib/contests/constants';
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
          <div className="h-8 w-48 bg-muted/50 animate-pulse rounded mb-4" />
          <div className="h-40 bg-muted/50 animate-pulse rounded-lg" />
        </div>
      </MainLayout>
    );
  }

  if (error || !contest) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl px-4 py-8 text-center">
          <p className="text-muted-foreground">Contest not found.</p>
          <Link href="/contests" className="text-sm text-amber-500 hover:underline mt-2 inline-block">
            Back to contests
          </Link>
        </div>
      </MainLayout>
    );
  }

  const hasEntered = !!contest.userEntry;
  const isComingSoon =
    contest.status === 'REGISTRATION' &&
    new Date(contest.registrationOpens).getTime() > Date.now();
  const canEnter = contest.status === 'REGISTRATION' && !isComingSoon && !hasEntered && !!user;
  const prizeNet = contest.prizePool * (1 - contest.platformFeePct - contest.creatorFeePct);

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
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Contests
        </Link>

        {/* Cover image */}
        {contest.coverImage && (
          <div className="relative h-48 w-full overflow-hidden rounded-xl mb-4">
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
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{contest.title}</h1>
              <p className="text-xs text-muted-foreground">
                Created by <Link href={`/user/${contest.creatorUsername}`} className="font-medium text-foreground hover:text-amber-500 transition-colors">@{contest.creatorUsername}</Link>
              </p>
              <p className="text-sm text-muted-foreground mt-1">{contest.description}</p>
            </div>
          </div>
          <ContestStatusBadge status={contest.status} comingSoon={isComingSoon} />
        </div>

        {/* Coming Soon — countdown + interest */}
        {isComingSoon && (
          <div className="space-y-3 mb-4">
            <ContestCountdown targetDate={contest.registrationOpens} />
            <ContestInterestButton
              slug={slug}
              isInterested={!!contest.isInterested}
              interestCount={contest.interestCount}
            />
          </div>
        )}

        {/* Prize summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg border bg-amber-500/5 p-3 text-center">
            <Coins className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {(prizeNet * CONTEST_CONFIG.PRIZE_SPLIT.FIRST).toFixed(0)}
            </div>
            <div className="text-[10px] text-muted-foreground">1st Prize MEDALS</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <div className="text-lg font-bold">{contest.entryCount}</div>
            <div className="text-[10px] text-muted-foreground">Entries</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <Trophy className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <div className="text-lg font-bold">{contest.prizePool.toFixed(0)}</div>
            <div className="text-[10px] text-muted-foreground">Total Pool</div>
          </div>
        </div>

        {/* User entry status */}
        {hasEntered && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 mb-4 text-sm">
            <span className="text-green-600 dark:text-green-400 font-medium">
              You&apos;re entered!
            </span>
            {contest.userEntry?.rank && (
              <span className="text-muted-foreground ml-2">
                Current rank: #{contest.userEntry.rank} ({contest.userEntry.totalScore} pts)
              </span>
            )}
          </div>
        )}

        {/* Enter CTA */}
        {canEnter && !showEntryForm && (
          <Button
            onClick={() => setShowEntryForm(true)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white mb-4"
            size="lg"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Enter Contest ({contest.entryFee} MEDALS)
          </Button>
        )}

        {/* Entry form */}
        {showEntryForm && canEnter && (
          <div className="rounded-lg border p-4 mb-4">
            <ContestEntryForm contest={contest} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === key
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{contest.rules}</ReactMarkdown>
              </div>
            )}
            <div className="rounded-lg border p-3">
              <h3 className="text-sm font-semibold mb-2">Prize Distribution</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1st Place (60%)</span>
                  <span className="font-medium">{(prizeNet * 0.60).toFixed(0)} MEDALS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">2nd Place (25%)</span>
                  <span className="font-medium">{(prizeNet * 0.25).toFixed(0)} MEDALS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">3rd Place (15%)</span>
                  <span className="font-medium">{(prizeNet * 0.15).toFixed(0)} MEDALS</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Platform Fee (10%)</span>
                  <span>{(contest.prizePool * contest.platformFeePct).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Creator Fee (10%)</span>
                  <span>{(contest.prizePool * contest.creatorFeePct).toFixed(0)}</span>
                </div>
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
