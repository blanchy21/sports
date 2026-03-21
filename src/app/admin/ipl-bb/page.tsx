'use client';

import React, { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminAccount } from '@/lib/admin/config';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryClient';
import { Button } from '@/components/core/Button';
import { Shield, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { toast } from '@/components/core/Toast';

interface AdminCompetition {
  id: string;
  title: string;
  season: string;
  roundNumber: number;
  status: string;
  dateFrom: string;
  dateTo: string;
  totalMatches: number;
  totalEntries: number;
  matches: AdminMatch[];
}

interface AdminMatch {
  id: string;
  matchNumber: number;
  homeTeam: string;
  awayTeam: string;
  venue: string | null;
  kickoffTime: string;
  status: string;
  actualBoundaries: number | null;
  fours: number | null;
  sixes: number | null;
  cricketDataMatchId: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-green-500/10 text-green-600 dark:text-green-400',
    active: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    complete: 'bg-sb-turf text-muted-foreground',
    upcoming: 'bg-sb-turf text-muted-foreground',
    locked: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    resolved: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    abandoned: 'bg-red-500/10 text-red-500',
  };
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        colors[status] || colors.upcoming
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}

function MatchRow({
  match,
  onStatusChange,
  onResolve,
}: {
  match: AdminMatch;
  onStatusChange: (matchId: string, status: string) => Promise<void>;
  onResolve: (matchId: string, fours: number, sixes: number) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fours, setFours] = useState<string>('');
  const [sixes, setSixes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const kickoff = new Date(match.kickoffTime);
  const dateStr = kickoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = kickoff.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handleResolve = async () => {
    const f = parseInt(fours);
    const s = parseInt(sixes);
    if (isNaN(f) || isNaN(s) || f < 0 || s < 0) {
      toast.error('Enter valid fours and sixes counts');
      return;
    }
    setLoading(true);
    try {
      await onResolve(match.id, f, s);
      setFours('');
      setSixes('');
      setExpanded(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b last:border-b-0">
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-sb-turf/30"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-6 text-center text-xs text-muted-foreground">{match.matchNumber}</span>
        <div className="flex flex-1 items-center gap-2 text-sm">
          <span className="font-medium">{match.homeTeam}</span>
          <span className="text-muted-foreground">vs</span>
          <span className="font-medium">{match.awayTeam}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {dateStr} {timeStr}
        </span>
        <StatusBadge status={match.status} />
        {match.status === 'resolved' && (
          <span className="text-sm font-bold">{match.actualBoundaries}</span>
        )}
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>

      {expanded && (
        <div className="border-t bg-sb-turf/20 px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {match.status === 'upcoming' && (
              <Button size="sm" onClick={() => onStatusChange(match.id, 'open')}>
                Open for Picks
              </Button>
            )}
            {match.status === 'open' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(match.id, 'locked')}
              >
                Lock Match
              </Button>
            )}
            {match.status !== 'resolved' && match.status !== 'abandoned' && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-500"
                onClick={() => onStatusChange(match.id, 'abandoned')}
              >
                Abandon
              </Button>
            )}
          </div>

          {(match.status === 'locked' || match.status === 'open') && (
            <div className="rounded-lg border bg-sb-stadium p-3">
              <div className="mb-2 text-sm font-semibold">Resolve Match</div>
              <p className="mb-3 text-xs text-muted-foreground">
                Boundaries = 4s + 6s only. Source: ESPN Cricinfo final scorecard. Overthrow 4s
                count. Wides and no-balls do not count.
              </p>
              <div className="flex items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Fours</label>
                  <input
                    type="number"
                    min="0"
                    value={fours}
                    onChange={(e) => setFours(e.target.value)}
                    className="h-9 w-20 rounded-lg border bg-sb-turf px-3 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Sixes</label>
                  <input
                    type="number"
                    min="0"
                    value={sixes}
                    onChange={(e) => setSixes(e.target.value)}
                    className="h-9 w-20 rounded-lg border bg-sb-turf px-3 text-sm"
                    placeholder="0"
                  />
                </div>
                {fours && sixes && (
                  <div className="text-sm">
                    ={' '}
                    <span className="font-bold">
                      {parseInt(fours || '0') + parseInt(sixes || '0')}
                    </span>{' '}
                    boundaries
                  </div>
                )}
                <Button size="sm" onClick={handleResolve} disabled={loading}>
                  {loading ? 'Resolving...' : 'Resolve'}
                </Button>
              </div>
            </div>
          )}

          {match.status === 'resolved' && (
            <div className="text-sm text-muted-foreground">
              Resolved: {match.actualBoundaries} boundaries ({match.fours} fours, {match.sixes}{' '}
              sixes)
              {match.resolvedBy && <span> by {match.resolvedBy}</span>}
              {match.resolvedAt && <span> at {new Date(match.resolvedAt).toLocaleString()}</span>}
            </div>
          )}

          {match.venue && (
            <div className="mt-2 text-xs text-muted-foreground">Venue: {match.venue}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IplBbAdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [competitions, setCompetitions] = useState<AdminCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComp, setExpandedComp] = useState<string | null>(null);

  const isAdmin = user && isAdminAccount(user.username);

  // Fetch competitions
  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ipl-bb/admin/competitions');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setCompetitions(json.data);
    } catch {
      toast.error('Failed to load competitions');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAdmin) fetchCompetitions();
  }, [isAdmin, fetchCompetitions]);

  const handleCompStatus = useCallback(
    async (compId: string, status: string) => {
      try {
        const res = await fetch(`/api/ipl-bb/admin/competition/${compId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || 'Failed');
        }
        toast.success(`Competition set to ${status}`);
        fetchCompetitions();
        queryClient.invalidateQueries({ queryKey: queryKeys.iplBb.all });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed');
      }
    },
    [fetchCompetitions, queryClient]
  );

  const handleMatchStatus = useCallback(
    async (matchId: string, status: string) => {
      try {
        const res = await fetch(`/api/ipl-bb/admin/match/${matchId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || 'Failed');
        }
        toast.success(`Match set to ${status}`);
        fetchCompetitions();
        queryClient.invalidateQueries({ queryKey: queryKeys.iplBb.all });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed');
      }
    },
    [fetchCompetitions, queryClient]
  );

  const handleResolve = useCallback(
    async (matchId: string, fours: number, sixes: number) => {
      try {
        const res = await fetch(`/api/ipl-bb/admin/match/${matchId}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fours, sixes }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || 'Failed');
        }
        const data = await res.json();
        toast.success(`Resolved: ${data.data.actualBoundaries} boundaries`);
        fetchCompetitions();
        queryClient.invalidateQueries({ queryKey: queryKeys.iplBb.all });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to resolve');
      }
    },
    [fetchCompetitions, queryClient]
  );

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Shield className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Admin access required</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IPL Boundary Blackjack — Admin</h1>
            <p className="text-sm text-muted-foreground">
              Manage competitions, matches, and results
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCompetitions} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {loading && competitions.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-sb-turf" />
            ))}
          </div>
        )}

        <div className="space-y-4">
          {competitions.map((comp) => (
            <div key={comp.id} className="overflow-hidden rounded-xl border bg-sb-stadium">
              {/* Competition header */}
              <div
                className="flex cursor-pointer items-center gap-3 px-5 py-4 hover:bg-sb-turf/20"
                onClick={() => setExpandedComp(expandedComp === comp.id ? null : comp.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold">{comp.title}</h2>
                    <StatusBadge status={comp.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {comp.totalEntries} entries &middot; {comp.totalMatches} matches
                  </div>
                </div>
                <div className="flex gap-2">
                  {comp.status === 'open' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompStatus(comp.id, 'active');
                      }}
                    >
                      Activate
                    </Button>
                  )}
                  {comp.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompStatus(comp.id, 'complete');
                      }}
                    >
                      Complete
                    </Button>
                  )}
                </div>
                {expandedComp === comp.id ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>

              {/* Expanded matches */}
              {expandedComp === comp.id && (
                <div className="border-t">
                  {comp.matches.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-muted-foreground">No matches</div>
                  ) : (
                    comp.matches.map((match) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        onStatusChange={handleMatchStatus}
                        onResolve={handleResolve}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
