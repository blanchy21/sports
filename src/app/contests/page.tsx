'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContestCard } from '@/components/contests/ContestCard';
import { LmsCompetitionCard } from '@/components/lms/LmsCompetitionCard';
import { IplBbCompetitionCard } from '@/components/ipl-bb/IplBbCompetitionCard';
import { useContestList } from '@/lib/react-query/queries/useContests';
import { useLmsCompetitions } from '@/lib/react-query/queries/useLms';
import { useIplBbCompetitions } from '@/lib/react-query/queries/useIplBb';
import { Trophy } from 'lucide-react';

export default function ContestsPage() {
  const { data: contests, isLoading, error } = useContestList();
  const { data: lmsCompetitions, isLoading: lmsLoading } = useLmsCompetitions();
  const { data: iplBbCompetitions, isLoading: iplBbLoading } = useIplBbCompetitions();

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* Page Header */}
        <div className="relative mb-8">
          {/* Subtle background glow */}
          <div
            className="pointer-events-none absolute -top-8 left-1/2 h-32 w-64 -translate-x-1/2 opacity-30 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(245,158,11,0.4), transparent 70%)',
            }}
          />

          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 ring-1 ring-amber-500/20">
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Contests</h1>
              <p className="text-sm text-muted-foreground">
                Compete for MEDALS prizes in sports fantasy competitions
              </p>
            </div>
          </div>
        </div>

        {/* LMS Competitions */}
        {lmsLoading && (
          <div className="mb-4 animate-pulse overflow-hidden rounded-2xl border bg-sb-stadium">
            <div className="h-44 bg-sb-turf" />
            <div className="px-5 pb-4 pt-4">
              <div className="mb-2 h-5 w-3/4 rounded bg-sb-turf" />
              <div className="h-3.5 w-1/2 rounded bg-sb-turf/60" />
            </div>
          </div>
        )}
        {lmsCompetitions && lmsCompetitions.length > 0 && (
          <div className="mb-4 space-y-4">
            {lmsCompetitions.map((comp) => (
              <LmsCompetitionCard key={comp.id} competition={comp} />
            ))}
          </div>
        )}

        {/* IPL Boundary Blackjack */}
        {iplBbLoading && (
          <div className="mb-4 animate-pulse overflow-hidden rounded-2xl border bg-sb-stadium">
            <div className="px-5 pb-4 pt-5">
              <div className="mb-2 h-5 w-3/4 rounded bg-sb-turf" />
              <div className="h-3.5 w-1/2 rounded bg-sb-turf/60" />
            </div>
          </div>
        )}
        {iplBbCompetitions && iplBbCompetitions.length > 0 && (
          <div className="mb-4 space-y-4">
            {iplBbCompetitions.map((comp) => (
              <IplBbCompetitionCard key={comp.id} competition={comp} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">Failed to load contests. Please try again.</p>
          </div>
        )}

        {/* Contest loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-2xl border bg-sb-stadium"
              >
                <div className="px-5 pb-4 pt-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 h-5 w-3/4 rounded bg-sb-turf" />
                      <div className="h-3.5 w-1/2 rounded bg-sb-turf/60" />
                    </div>
                    <div className="h-6 w-14 rounded-full bg-sb-turf" />
                  </div>
                  <div className="flex items-center gap-4 rounded-xl bg-sb-turf/30 p-4">
                    <div className="h-14 w-14 rounded-2xl bg-sb-turf" />
                    <div className="flex-1">
                      <div className="mb-1.5 h-3 w-20 rounded bg-sb-turf/60" />
                      <div className="mb-2 h-7 w-32 rounded bg-sb-turf" />
                      <div className="h-3 w-40 rounded bg-sb-turf/40" />
                    </div>
                  </div>
                </div>
                <div className="border-t border-sb-border/50 bg-sb-stadium px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-28 rounded bg-sb-turf/60" />
                    <div className="h-4 w-20 rounded bg-sb-turf/60" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading &&
          !lmsLoading &&
          !iplBbLoading &&
          contests?.length === 0 &&
          (!lmsCompetitions || lmsCompetitions.length === 0) &&
          (!iplBbCompetitions || iplBbCompetitions.length === 0) && (
            <div className="rounded-2xl border border-dashed border-sb-border p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sb-turf/50">
                <Trophy className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="mb-1 text-base font-medium text-muted-foreground">
                No contests available yet
              </p>
              <p className="text-sm text-muted-foreground/70">
                Check back soon for new competitions.
              </p>
            </div>
          )}

        {/* Contest list */}
        {contests && contests.length > 0 && (
          <div className="space-y-4">
            {contests.map((contest) => (
              <ContestCard key={contest.id} contest={contest} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
