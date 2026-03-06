'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContestCard } from '@/components/contests/ContestCard';
import { useContestList } from '@/lib/react-query/queries/useContests';
import { Trophy } from 'lucide-react';

export default function ContestsPage() {
  const { data: contests, isLoading, error } = useContestList();

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* Page Header */}
        <div className="relative mb-8">
          {/* Subtle background glow */}
          <div
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-32 w-64 opacity-30 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(245,158,11,0.4), transparent 70%)',
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

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border bg-card overflow-hidden animate-pulse"
              >
                {/* Top section skeleton */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="h-5 w-3/4 bg-muted rounded mb-2" />
                      <div className="h-3.5 w-1/2 bg-muted/60 rounded" />
                    </div>
                    <div className="h-6 w-14 bg-muted rounded-full" />
                  </div>
                  <div className="flex items-center gap-4 rounded-xl bg-muted/30 p-4">
                    <div className="h-14 w-14 bg-muted rounded-2xl" />
                    <div className="flex-1">
                      <div className="h-3 w-20 bg-muted/60 rounded mb-1.5" />
                      <div className="h-7 w-32 bg-muted rounded mb-2" />
                      <div className="h-3 w-40 bg-muted/40 rounded" />
                    </div>
                  </div>
                </div>
                {/* Stats bar skeleton */}
                <div className="grid grid-cols-2 gap-px bg-border/50 border-t border-border/50">
                  <div className="bg-card px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-muted rounded-lg" />
                      <div>
                        <div className="h-2.5 w-12 bg-muted/60 rounded mb-1.5" />
                        <div className="h-4 w-16 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-card px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-muted rounded-lg" />
                      <div>
                        <div className="h-2.5 w-12 bg-muted/60 rounded mb-1.5" />
                        <div className="h-4 w-16 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Footer skeleton */}
                <div className="border-t border-border/50 bg-card px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-28 bg-muted/60 rounded" />
                    <div className="h-4 w-20 bg-muted/60 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">
              Failed to load contests. Please try again.
            </p>
          </div>
        )}

        {/* Empty state */}
        {contests && contests.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-base font-medium text-muted-foreground mb-1">
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
