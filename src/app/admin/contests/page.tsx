'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminAccount } from '@/lib/admin/config';
import { useContestList } from '@/lib/react-query/queries/useContests';
import { ContestStatusBadge } from '@/components/contests/ContestStatusBadge';
import { Trophy, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/core/Button';
import Link from 'next/link';

export default function AdminContestsPage() {
  const { user, hiveUser } = useAuth();
  const username = hiveUser?.username || user?.hiveUsername || user?.username;
  const isAdmin = username ? isAdminAccount(username) : false;

  const { data: contests, isLoading, refetch } = useContestList({ limit: 50 });

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h1 className="text-xl font-bold">Contest Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contests list */}
        {isLoading && <div className="h-20 animate-pulse rounded-lg bg-sb-turf/50" />}

        {contests && contests.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No contests yet.</p>
        )}

        {contests && contests.length > 0 && (
          <div className="space-y-2">
            {contests.map((contest) => (
              <div
                key={contest.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-sb-turf/50"
              >
                <Link href={`/contests/${contest.slug}`} className="flex flex-1 items-center gap-3">
                  <div>
                    <div className="text-sm font-medium">{contest.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {contest.entryCount} entries | {contest.prizePool.toFixed(0)} MEDALS pool
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {contest.contestType === 'GOLF_FANTASY' && (
                    <Link
                      href={`/admin/contests/${contest.slug}/golf-scores`}
                      className="rounded bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-500/30"
                    >
                      Scores
                    </Link>
                  )}
                  <ContestStatusBadge status={contest.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help text */}
        <div className="mt-6 space-y-2 rounded-lg border bg-sb-turf/30 p-4 text-xs text-muted-foreground">
          <p className="text-sm font-medium text-sb-text-primary">Admin Actions</p>
          <p>Create contests, add matches, and enter results via the API:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code>POST /api/contests</code> — Create a contest
            </li>
            <li>
              <code>PATCH /api/contests/[slug]</code> — Update status (DRAFT → REGISTRATION →
              ACTIVE)
            </li>
            <li>
              <code>POST /api/contests/[slug]/matches</code> — Add matches (batch)
            </li>
            <li>
              <code>PATCH /api/contests/[slug]/matches/[id]/result</code> — Enter match result
            </li>
            <li>
              <code>POST /api/contests/[slug]/settle</code> — Settle and distribute prizes
            </li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
