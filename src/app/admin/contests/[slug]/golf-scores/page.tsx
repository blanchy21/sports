'use client';

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminAccount } from '@/lib/admin/config';
import { Button } from '@/components/core/Button';
import { RefreshCw, CheckCircle, AlertCircle, ArrowLeft, Loader2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useContest } from '@/lib/react-query/queries/useContests';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/client';
import type { EspnGolferData, GolfScoringState } from '@/lib/contests/espn-golf';

interface GolfScoresData {
  scoring: GolfScoringState;
  teams: Array<{ code: string; name: string; metadata: unknown }>;
}

function useFetchGolfScores(slug: string) {
  return useQuery({
    queryKey: ['golf-scores', slug],
    queryFn: async (): Promise<GolfScoresData> => {
      const res = await fetch(`/api/contests/${slug}/golf-scores`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch');
      return json.data;
    },
    staleTime: 10_000,
  });
}

function useGolfAction(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/contests/${slug}/golf-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Action failed');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['golf-scores', slug] });
    },
  });
}

export default function GolfScoresAdminPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, hiveUser } = useAuth();
  const username = hiveUser?.username || user?.hiveUsername || user?.username;
  const isAdmin = username ? isAdminAccount(username) : false;

  const { data: contest } = useContest(slug);
  const { data: scoresData, isLoading } = useFetchGolfScores(slug);
  const action = useGolfAction(slug);

  const [winningScoreInput, setWinningScoreInput] = useState('');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </MainLayout>
    );
  }

  const scoring = scoresData?.scoring;
  const teams = scoresData?.teams || [];

  // Build a map of team code → published metadata for display
  const publishedMap = new Map<string, Record<string, unknown>>();
  for (const t of teams) {
    if (t.metadata) publishedMap.set(t.code, t.metadata as Record<string, unknown>);
  }

  // Determine what to show in the scores table
  const draftScores = scoring?.draftScores;
  const hasDraft = draftScores && draftScores.length > 0;

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl px-4 py-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/admin/contests" className="text-muted-foreground hover:text-sb-text-primary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Trophy className="h-5 w-5 text-green-500" />
          <h1 className="text-lg font-bold">Golf Scores — {contest?.title || slug}</h1>
        </div>

        {/* Status bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-sb-turf/30 p-3 text-xs">
          <div>
            <span className="text-muted-foreground">Published round: </span>
            <span className="font-semibold">{scoring?.publishedRound || 'None'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Winning score: </span>
            <span className="font-semibold">
              {scoring?.winningScore !== null && scoring?.winningScore !== undefined
                ? scoring.winningScore
                : 'Not set'}
            </span>
          </div>
          {scoring?.draftFetchedAt && (
            <div>
              <span className="text-muted-foreground">Draft fetched: </span>
              <span className="font-semibold">
                {new Date(scoring.draftFetchedAt).toLocaleString()}
              </span>
            </div>
          )}
          {hasDraft && (
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-400">
              Draft pending approval
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => action.mutate({ action: 'sync' })}
            disabled={action.isPending}
          >
            {action.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Sync from ESPN
          </Button>

          {hasDraft && !showPublishConfirm && (
            <Button size="sm" variant="primary" onClick={() => setShowPublishConfirm(true)}>
              <CheckCircle className="mr-1 h-3 w-3" />
              Approve & Publish
            </Button>
          )}

          {showPublishConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400">Publish scores to leaderboard?</span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  action.mutate({ action: 'publish' });
                  setShowPublishConfirm(false);
                }}
                disabled={action.isPending}
              >
                Yes, Publish
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPublishConfirm(false)}>
                Cancel
              </Button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <input
              type="number"
              placeholder="Winning score (e.g. -12)"
              value={winningScoreInput}
              onChange={(e) => setWinningScoreInput(e.target.value)}
              className="bg-sb-bg w-40 rounded border px-2 py-1 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const score = parseInt(winningScoreInput, 10);
                if (!isNaN(score)) {
                  action.mutate({ action: 'set-winning-score', score });
                  setWinningScoreInput('');
                }
              }}
              disabled={!winningScoreInput || action.isPending}
            >
              Set Tiebreaker
            </Button>
          </div>
        </div>

        {/* Action result */}
        {action.isSuccess && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-400">
            Action completed successfully.{' '}
            {action.data?.matched !== undefined && `Matched: ${action.data.matched}`}
            {action.data?.teamsUpdated !== undefined && ` | Updated: ${action.data.teamsUpdated}`}
            {action.data?.entriesRecalculated !== undefined &&
              ` | Recalculated: ${action.data.entriesRecalculated} entries`}
            {action.data?.tournamentName && ` | Tournament: ${action.data.tournamentName}`}
          </div>
        )}

        {action.isError && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="mr-1 inline h-3 w-3" />
            {(action.error as Error).message}
          </div>
        )}

        {/* Unmatched names */}
        {scoring?.unmatchedNames && scoring.unmatchedNames.length > 0 && (
          <UnmatchedSection
            names={scoring.unmatchedNames}
            teams={teams}
            onOverride={(espnName, teamCode) => {
              action.mutate({ action: 'override', espnName, teamCode });
            }}
            isPending={action.isPending}
          />
        )}

        {/* Scores table */}
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-sb-turf/50" />
        ) : hasDraft ? (
          <DraftScoresTable scores={draftScores} teams={teams} />
        ) : (
          <PublishedScoresTable teams={teams} />
        )}
      </div>
    </MainLayout>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function UnmatchedSection({
  names,
  teams,
  onOverride,
  isPending,
}: {
  names: string[];
  teams: Array<{ code: string; name: string }>;
  onOverride: (espnName: string, teamCode: string) => void;
  isPending: boolean;
}) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  return (
    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
      <p className="mb-2 text-xs font-medium text-amber-400">
        <AlertCircle className="mr-1 inline h-3 w-3" />
        {names.length} unmatched ESPN names — assign manually:
      </p>
      <div className="space-y-1">
        {names.map((name) => (
          <div key={name} className="flex items-center gap-2 text-xs">
            <span className="min-w-[180px] text-sb-text-primary">{name}</span>
            <select
              className="bg-sb-bg rounded border px-2 py-1 text-xs"
              value={overrides[name] || ''}
              onChange={(e) => setOverrides((prev) => ({ ...prev, [name]: e.target.value }))}
            >
              <option value="">Select golfer...</option>
              {teams.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => overrides[name] && onOverride(name, overrides[name])}
              disabled={!overrides[name] || isPending}
            >
              Assign
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftScoresTable({
  scores,
  teams,
}: {
  scores: EspnGolferData[];
  teams: Array<{ code: string; name: string }>;
}) {
  const sorted = [...scores].sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Golfer</th>
              <th className="px-3 py-2 text-center">R1</th>
              <th className="px-3 py-2 text-center">R2</th>
              <th className="px-3 py-2 text-center">R3</th>
              <th className="px-3 py-2 text-center">R4</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <tr key={g.espnName} className="border-b border-sb-turf/30 hover:bg-sb-turf/30">
                <td className="px-3 py-1.5 font-mono">{g.order}</td>
                <td className="px-3 py-1.5 font-medium">{g.espnName}</td>
                <RoundCell round={g.rounds[1]} />
                <RoundCell round={g.rounds[2]} />
                <RoundCell round={g.rounds[3]} />
                <RoundCell round={g.rounds[4]} />
                <td
                  className={cn(
                    'px-3 py-1.5 text-right font-semibold',
                    g.scoreRelToPar < 0 && 'text-green-400',
                    g.scoreRelToPar > 0 && 'text-red-400'
                  )}
                >
                  {g.scoreDisplay}
                </td>
                <td className="px-3 py-1.5 text-center">
                  <StatusBadge status={g.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t p-2 text-center text-xs text-muted-foreground">
        Draft — {scores.length} golfers fetched from ESPN
      </div>
    </div>
  );
}

function PublishedScoresTable({
  teams,
}: {
  teams: Array<{ code: string; name: string; metadata: unknown }>;
}) {
  // Sort by position if available, else by name
  const sorted = [...teams].sort((a, b) => {
    const metaA = a.metadata as Record<string, unknown> | null;
    const metaB = b.metadata as Record<string, unknown> | null;
    const posA = (metaA?.position as number) ?? 999;
    const posB = (metaB?.position as number) ?? 999;
    if (posA !== posB) return posA - posB;
    return a.name.localeCompare(b.name);
  });

  const hasScores = sorted.some((t) => {
    const meta = t.metadata as Record<string, unknown> | null;
    return meta?.scoreRelToPar !== undefined;
  });

  if (!hasScores) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No scores published yet. Click &quot;Sync from ESPN&quot; to fetch the latest scores.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2">Golfer</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2 text-center">R1</th>
              <th className="px-3 py-2 text-center">R2</th>
              <th className="px-3 py-2 text-center">R3</th>
              <th className="px-3 py-2 text-center">R4</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const meta = t.metadata as Record<string, unknown> | null;
              const rounds = (meta?.rounds as Record<string, string>) || {};
              const score = meta?.scoreRelToPar as number | undefined;
              const position = meta?.position as number | undefined;
              const status = (meta?.status as string) || 'active';

              return (
                <tr key={t.code} className="border-b border-sb-turf/30 hover:bg-sb-turf/30">
                  <td className="px-3 py-1.5 font-mono">{position ?? '-'}</td>
                  <td className="px-3 py-1.5 font-medium">{t.name}</td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{t.code}</td>
                  <RoundCellStr value={rounds['1']} />
                  <RoundCellStr value={rounds['2']} />
                  <RoundCellStr value={rounds['3']} />
                  <RoundCellStr value={rounds['4']} />
                  <td
                    className={cn(
                      'px-3 py-1.5 text-right font-semibold',
                      score !== undefined && score < 0 && 'text-green-400',
                      score !== undefined && score > 0 && 'text-red-400'
                    )}
                  >
                    {score !== undefined
                      ? score === 0
                        ? 'E'
                        : score > 0
                          ? `+${score}`
                          : `${score}`
                      : '-'}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <StatusBadge status={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t p-2 text-center text-xs text-muted-foreground">
        Published scores — {sorted.length} golfers
      </div>
    </div>
  );
}

function RoundCell({ round }: { round?: { display: string; strokes: number } }) {
  if (!round) return <td className="px-3 py-1.5 text-center text-muted-foreground">-</td>;
  const val = round.display;
  return (
    <td
      className={cn(
        'px-3 py-1.5 text-center font-mono',
        val.startsWith('-') && 'text-green-400',
        val.startsWith('+') && 'text-red-400'
      )}
    >
      {val}
      <span className="ml-1 text-muted-foreground">({round.strokes})</span>
    </td>
  );
}

function RoundCellStr({ value }: { value?: string }) {
  if (!value) return <td className="px-3 py-1.5 text-center text-muted-foreground">-</td>;
  return (
    <td
      className={cn(
        'px-3 py-1.5 text-center font-mono',
        value.startsWith('-') && 'text-green-400',
        value.startsWith('+') && 'text-red-400'
      )}
    >
      {value}
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return null;
  const colors: Record<string, string> = {
    cut: 'bg-red-500/20 text-red-400',
    wd: 'bg-amber-500/20 text-amber-400',
    dq: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium uppercase', colors[status])}>
      {status}
    </span>
  );
}
