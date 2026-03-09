'use client';

import React, { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminAccount } from '@/lib/admin/config';
import {
  useLmsCompetitions,
  useLmsCompetition,
  useLmsBoard,
} from '@/lib/react-query/queries/useLms';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryClient';
import { Button } from '@/components/core/Button';
import {
  Shield,
  RefreshCw,
  ChevronRight,
  Users,
  Play,
  Lock,
  BarChart3,
  CheckCircle2,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils/client';
import type { LmsCompetitionResponse, LmsFixture } from '@/lib/lms/types';

// State transitions
const STATE_TRANSITIONS: Record<string, { next: string; label: string; icon: React.ReactNode }> = {
  open: { next: 'picking', label: 'Open Picks', icon: <Play className="h-4 w-4" /> },
  picking: { next: 'locked', label: 'Lock Picks', icon: <Lock className="h-4 w-4" /> },
  locked: { next: 'results', label: 'Enter Results', icon: <BarChart3 className="h-4 w-4" /> },
  results: { next: 'picking', label: 'Next Gameweek', icon: <ChevronRight className="h-4 w-4" /> },
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-green-500/10 text-green-600 dark:text-green-400',
    picking: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    locked: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    results: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    complete: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        colors[status] || colors.complete
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}

function CompetitionAdmin({ competition }: { competition: LmsCompetitionResponse }) {
  const queryClient = useQueryClient();
  const { data: detail } = useLmsCompetition(competition.id);
  const { data: board, refetch: refetchBoard } = useLmsBoard(competition.id);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fixtureResults, setFixtureResults] = useState<
    Record<string, { homeGoals: string; awayGoals: string; postponed: boolean }>
  >({});

  const comp = detail || competition;
  const fixtures = (comp.currentGameweekData?.fixtures || []) as LmsFixture[];
  const transition = STATE_TRANSITIONS[comp.status];
  const aliveCount = comp.aliveCount ?? 0;

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.lms.all });
  }, [queryClient]);

  const handleStateTransition = async () => {
    if (!transition) return;
    setLoading('transition');
    setError('');
    setSuccess('');
    try {
      const nextStatus = transition.next;
      // If going from results → picking, advance gameweek
      const body: Record<string, unknown> = { status: nextStatus };
      if (comp.status === 'results') {
        body.currentGameweek = comp.currentGameweek + 1;
      }

      const res = await fetch(`/api/lms/admin/competition/${comp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || 'Failed');
      }
      setSuccess(`Status updated to ${nextStatus}`);
      invalidateAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading('');
    }
  };

  const handleAutoPick = async () => {
    setLoading('autopick');
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/lms/admin/competition/${comp.id}/autopick`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || 'Failed');
      }
      const data = await res.json();
      const count = data.data?.autoPicked?.length || 0;
      setSuccess(`Auto-picked ${count} player${count !== 1 ? 's' : ''}`);
      invalidateAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading('');
    }
  };

  const handleResolve = async () => {
    setLoading('resolve');
    setError('');
    setSuccess('');
    try {
      const results = fixtures.map((f) => {
        const key = `${f.homeTeam}-${f.awayTeam}`;
        const entry = fixtureResults[key];
        return {
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          homeGoals: entry?.postponed ? 0 : parseInt(entry?.homeGoals || '0'),
          awayGoals: entry?.postponed ? 0 : parseInt(entry?.awayGoals || '0'),
          postponed: entry?.postponed || false,
        };
      });

      const res = await fetch(`/api/lms/admin/competition/${comp.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameweek: comp.currentGameweek, results }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || err.error || 'Failed');
      }
      const data = await res.json();
      setSuccess(
        `Resolved GW${comp.currentGameweek}: ${data.data.survivorsCount} survived, ${data.data.eliminatedCount} eliminated`
      );
      invalidateAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading('');
    }
  };

  const updateFixtureResult = (key: string, field: string, value: string | boolean) => {
    setFixtureResults((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        homeGoals: prev[key]?.homeGoals || '0',
        awayGoals: prev[key]?.awayGoals || '0',
        postponed: prev[key]?.postponed || false,
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{comp.name}</h2>
            <p className="text-sm text-muted-foreground">
              GW{comp.currentGameweek} &middot; {comp.totalEntries} entries &middot; {aliveCount}{' '}
              alive
            </p>
          </div>
          <StatusBadge status={comp.status} />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {transition && comp.status !== 'complete' && (
            <Button size="sm" onClick={handleStateTransition} disabled={!!loading}>
              {loading === 'transition' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                transition.icon
              )}
              <span className="ml-1.5">{transition.label}</span>
            </Button>
          )}
          {(comp.status === 'picking' || comp.status === 'locked') && (
            <Button size="sm" variant="outline" onClick={handleAutoPick} disabled={!!loading}>
              {loading === 'autopick' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span className="ml-1.5">Auto-Pick</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              invalidateAll();
              refetchBoard();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/5 p-2.5 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-500/5 p-2.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            {success}
          </div>
        )}
      </div>

      {/* Fixture Results Entry (locked state) */}
      {comp.status === 'locked' && fixtures.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">GW{comp.currentGameweek} Results</h3>
          <div className="space-y-2">
            {fixtures.map((f) => {
              const key = `${f.homeTeam}-${f.awayTeam}`;
              const entry = fixtureResults[key] || {
                homeGoals: '',
                awayGoals: '',
                postponed: false,
              };
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="w-28 truncate text-right font-medium">{f.homeTeam}</span>
                  <input
                    type="number"
                    min="0"
                    className="w-12 rounded border bg-background px-2 py-1 text-center text-sm"
                    value={entry.homeGoals}
                    onChange={(e) => updateFixtureResult(key, 'homeGoals', e.target.value)}
                    disabled={entry.postponed}
                    placeholder="-"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    min="0"
                    className="w-12 rounded border bg-background px-2 py-1 text-center text-sm"
                    value={entry.awayGoals}
                    onChange={(e) => updateFixtureResult(key, 'awayGoals', e.target.value)}
                    disabled={entry.postponed}
                    placeholder="-"
                  />
                  <span className="w-28 truncate font-medium">{f.awayTeam}</span>
                  <label className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={entry.postponed}
                      onChange={(e) => updateFixtureResult(key, 'postponed', e.target.checked)}
                      className="rounded"
                    />
                    PPD
                  </label>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Button size="sm" onClick={handleResolve} disabled={!!loading} className="w-full">
              {loading === 'resolve' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span className="ml-1.5">Resolve Gameweek {comp.currentGameweek}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Player Board */}
      {board && board.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Players ({board.length})</h3>
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {board.map((entry, i) => (
              <div
                key={entry.username}
                className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-xs text-muted-foreground">{i + 1}</span>
                  <span
                    className={cn(
                      'h-2 w-2 flex-shrink-0 rounded-full',
                      entry.status === 'alive' && 'bg-green-500',
                      entry.status === 'eliminated' && 'bg-red-500',
                      entry.status === 'winner' && 'bg-amber-500'
                    )}
                  />
                  <span className="font-medium">@{entry.username}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {entry.currentPick && (
                    <span className="font-medium text-foreground">{entry.currentPick}</span>
                  )}
                  {entry.lastPick && (
                    <span>
                      {entry.lastPick.team} ({entry.lastPick.result})
                    </span>
                  )}
                  <span>
                    {entry.gameweeksSurvived} GW{entry.gameweeksSurvived !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLmsPage() {
  const { user, hiveUser } = useAuth();
  const username = hiveUser?.username || user?.hiveUsername || user?.username;
  const isAdmin = username ? isAdminAccount(username) : false;
  const { data: competitions, isLoading, refetch } = useLmsCompetitions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </MainLayout>
    );
  }

  const selectedComp = competitions?.find((c) => c.id === selectedId);

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-amber-500" />
            <h1 className="text-xl font-bold">LMS Admin</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {isLoading && <div className="h-20 animate-pulse rounded-lg bg-muted/50" />}

        {/* Competition list */}
        {competitions && !selectedId && (
          <div className="space-y-2">
            {competitions.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No LMS competitions.</p>
            )}
            {competitions.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setSelectedId(comp.id)}
                className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={comp.status} />
                  <div>
                    <div className="text-sm font-medium">{comp.name}</div>
                    <div className="text-xs text-muted-foreground">
                      GW{comp.currentGameweek} &middot; <Users className="inline h-3 w-3" />{' '}
                      {comp.totalEntries} entries
                      {comp.aliveCount !== undefined && ` (${comp.aliveCount} alive)`}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Selected competition admin */}
        {selectedComp && (
          <div>
            <button
              onClick={() => setSelectedId(null)}
              className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-3 w-3 rotate-180" />
              Back to list
            </button>
            <CompetitionAdmin competition={selectedComp} />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
