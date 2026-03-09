'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  useLmsCompetition,
  useLmsBoard,
  useLmsMyPick,
  useLmsJoin,
} from '@/lib/react-query/queries/useLms';
import { LmsHero } from '@/components/lms/LmsHero';
import { LmsMyPick } from '@/components/lms/LmsMyPick';
import { LmsSurvivalBoard } from '@/components/lms/LmsSurvivalBoard';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

const COMPETITION_ID = 'lms-pl-2526-001';

function LmsRulesSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">How It Works</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t px-5 py-4 text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">1. Join for free</span> — Enter the
            competition at no cost.
          </div>
          <div>
            <span className="font-semibold text-foreground">2. Pick a team each gameweek</span> —
            Select one Premier League team to win their match. You can only use each team once
            throughout the entire competition.
          </div>
          <div>
            <span className="font-semibold text-foreground">3. Survive or be eliminated</span> — If
            your team wins, you survive. If they draw or lose, you&apos;re eliminated.
          </div>
          <div>
            <span className="font-semibold text-foreground">4. Last one standing wins</span> — The
            last survivor takes the entire prize pool.
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-xs">
            <span className="font-semibold text-foreground">Auto-pick:</span> If you don&apos;t
            submit a pick before the deadline, the first alphabetically available team will be
            assigned automatically.
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-xs">
            <span className="font-semibold text-foreground">Postponed matches:</span> If your
            team&apos;s match is postponed, the team is returned to your available pool and you
            survive the gameweek.
          </div>
        </div>
      )}
    </div>
  );
}

function LmsPageContent() {
  const { isAuthenticated } = useAuth();
  const { data: competition, isLoading, error } = useLmsCompetition(COMPETITION_ID);
  const { data: board } = useLmsBoard(COMPETITION_ID);
  const { data: pickData } = useLmsMyPick(COMPETITION_ID, { enabled: isAuthenticated });
  const joinMutation = useLmsJoin(COMPETITION_ID);

  const isEntered = !!pickData?.entry;
  const isAlive = pickData?.entry?.status === 'alive';
  const deadline = competition?.currentGameweekData?.deadline;
  const isDeadlinePassed = deadline ? new Date(deadline).getTime() < Date.now() : false;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Hero skeleton */}
        <div className="animate-pulse rounded-2xl border bg-card p-6">
          <div className="mb-4 h-4 w-32 rounded bg-muted" />
          <div className="mb-2 h-8 w-2/3 rounded bg-muted" />
          <div className="mb-6 h-4 w-full rounded bg-muted/60" />
          <div className="h-12 w-48 rounded-xl bg-muted" />
        </div>
        {/* Board skeleton */}
        <div className="animate-pulse rounded-2xl border bg-card p-6">
          <div className="mb-4 h-6 w-40 rounded bg-muted" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-2 h-10 w-full rounded bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">Failed to load competition. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero */}
      <LmsHero
        competition={competition}
        isEntered={isEntered}
        isAlive={isAlive}
        onJoin={() => joinMutation.mutate()}
        joining={joinMutation.isPending}
      />

      {/* Join error */}
      {joinMutation.isError && (
        <div className="rounded-xl bg-red-500/5 p-3 text-sm text-red-600 ring-1 ring-red-500/10 dark:text-red-400">
          {joinMutation.error.message}
        </div>
      )}

      {/* Rules */}
      <LmsRulesSection />

      {/* My Pick (authenticated + alive) */}
      {isAuthenticated && isAlive && (
        <LmsMyPick competitionId={COMPETITION_ID} competition={competition} />
      )}

      {/* Survival Board */}
      {board && <LmsSurvivalBoard entries={board} isDeadlinePassed={isDeadlinePassed} />}
    </div>
  );
}

export default function LmsDetailPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-4">
        <LmsPageContent />
      </div>
    </MainLayout>
  );
}
