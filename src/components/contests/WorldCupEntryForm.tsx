'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Check, ChevronRight, ChevronLeft, Trophy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/core/Button';
import {
  useContestTeams,
  useContestEntry,
  useContestEntryConfirm,
} from '@/lib/react-query/queries/useContests';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useAuth } from '@/contexts/AuthContext';
import { useMedalsBalance } from '@/lib/react-query/queries/useMedals';
import { useContestStore } from '@/stores/contestStore';
import { cn } from '@/lib/utils/client';
import type { ContestResponse, ContestTeamResponse } from '@/lib/contests/types';

type Step = 'teams' | 'multipliers' | 'tiebreaker' | 'confirm';

export function WorldCupEntryForm({ contest }: { contest: ContestResponse }) {
  const slug = contest.slug;
  const { data: teams } = useContestTeams(slug);
  const { user, hiveUser } = useAuth();
  const walletUsername = hiveUser?.username || user?.hiveUsername;
  const { data: medalsBalance } = useMedalsBalance(walletUsername);
  const { broadcast } = useBroadcast();
  const entryMutation = useContestEntry(slug);
  const confirmMutation = useContestEntryConfirm(slug);
  const { setIsEntering } = useContestStore();

  const [step, setStep] = useState<Step>('teams');
  const [selectedTeams, setSelectedTeams] = useState<Map<string, number>>(new Map());
  const [multipliers, setMultipliers] = useState<Map<string, number>>(new Map());
  const [tieBreaker, setTieBreaker] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const teamsByPot = useMemo(() => {
    if (!teams) return new Map<number, ContestTeamResponse[]>();
    const grouped = new Map<number, ContestTeamResponse[]>();
    for (const team of teams) {
      const pot = grouped.get(team.pot) || [];
      pot.push(team);
      grouped.set(team.pot, pot);
    }
    return grouped;
  }, [teams]);

  const potCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const pot of selectedTeams.values()) {
      counts[pot] = (counts[pot] || 0) + 1;
    }
    return counts;
  }, [selectedTeams]);

  const toggleTeam = useCallback((code: string, pot: number) => {
    setSelectedTeams((prev) => {
      const next = new Map(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        let potCount = 0;
        for (const p of next.values()) {
          if (p === pot) potCount++;
        }
        if (potCount >= 4) return prev;
        next.set(code, pot);
      }
      return next;
    });
  }, []);

  const assignMultiplier = useCallback((code: string, mult: number) => {
    setMultipliers((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next.entries()) {
        if (v === mult) next.delete(k);
      }
      next.set(code, mult);
      return next;
    });
  }, []);

  const usedMultipliers = useMemo(() => new Set(multipliers.values()), [multipliers]);

  const canProceedToMultipliers = selectedTeams.size === 16;
  const canProceedToTieBreaker = multipliers.size === 16;
  const canProceedToConfirm =
    tieBreaker !== '' && Number(tieBreaker) >= 0 && Number(tieBreaker) <= 500;

  const buildEntryData = useCallback(() => {
    const picks = Array.from(selectedTeams.entries()).map(([code, pot]) => ({
      teamCode: code,
      pot,
      multiplier: multipliers.get(code)!,
    }));
    return { picks, tieBreaker: Number(tieBreaker) };
  }, [selectedTeams, multipliers, tieBreaker]);

  const [freeEntrySuccess, setFreeEntrySuccess] = useState(false);

  const handleSubmit = async () => {
    if (!walletUsername) return;

    setError(null);
    setIsEntering(true);

    try {
      const entryData = buildEntryData();

      const res = await entryMutation.mutateAsync(entryData);
      const { operation, entryToken, entryConfirmed } = res.data;

      // Free entry — already confirmed server-side, no broadcast needed
      if (entryConfirmed) {
        setFreeEntrySuccess(true);
        setStep('confirm');
        return;
      }

      const broadcastResult = await broadcast([['custom_json', operation]], 'active');

      if (!broadcastResult.success) {
        throw new Error(broadcastResult.error || 'Broadcast failed');
      }

      await confirmMutation.mutateAsync({
        entryToken,
        txId: broadcastResult.transactionId,
        entryData,
      });

      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit entry');
    } finally {
      setIsEntering(false);
    }
  };

  if (confirmMutation.isSuccess || freeEntrySuccess) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
          <Check className="h-6 w-6 text-green-500" />
        </div>
        <h3 className="mb-1 text-lg font-semibold">You&apos;re In!</h3>
        <p className="text-sm text-muted-foreground">
          Your entry has been confirmed. Check the leaderboard for your position.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(['teams', 'multipliers', 'tiebreaker', 'confirm'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <span
              className={cn(
                'rounded-full px-2 py-1',
                step === s ? 'bg-amber-500/10 font-medium text-amber-500' : 'text-muted-foreground'
              )}
            >
              {['Select Teams', 'Assign Multipliers', 'Tie-Breaker', 'Confirm'][i]}
            </span>
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Team Selection */}
      {step === 'teams' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select exactly 4 teams from each pot (16 total).
          </p>
          {[1, 2, 3, 4].map((pot) => {
            const potTeams = teamsByPot.get(pot) || [];
            return (
              <div key={pot}>
                <h4 className="mb-2 text-sm font-semibold">
                  Pot {pot}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {potCounts[pot] || 0}/4 selected
                  </span>
                </h4>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {potTeams.map((team) => {
                    const isSelected = selectedTeams.has(team.code);
                    const potFull = (potCounts[pot] || 0) >= 4;
                    return (
                      <button
                        key={team.code}
                        onClick={() => toggleTeam(team.code, team.pot)}
                        disabled={!isSelected && potFull}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-colors',
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : potFull
                              ? 'border-muted bg-sb-turf/30 text-muted-foreground opacity-50'
                              : 'border-muted hover:border-amber-500/50'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{team.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button
              onClick={() => setStep('multipliers')}
              disabled={!canProceedToMultipliers}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              Next: Assign Multipliers
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Multiplier Assignment */}
      {step === 'multipliers' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Assign a unique multiplier (1-16) to each team. Higher multiplier = more points from
            that team.
          </p>
          <div className="space-y-2">
            {Array.from(selectedTeams.entries()).map(([code, pot]) => {
              const team = teams?.find((t) => t.code === code);
              const currentMult = multipliers.get(code);
              return (
                <div key={code} className="flex items-center gap-2 rounded-lg border p-2">
                  <span className="w-8 text-xs text-muted-foreground">P{pot}</span>
                  <span className="flex-1 truncate text-sm font-medium">{team?.name || code}</span>
                  <select
                    value={currentMult || ''}
                    onChange={(e) => assignMultiplier(code, Number(e.target.value))}
                    className="w-16 rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">-</option>
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                      <option
                        key={n}
                        value={n}
                        disabled={usedMultipliers.has(n) && currentMult !== n}
                      >
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('teams')}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => setStep('tiebreaker')}
              disabled={!canProceedToTieBreaker}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              Next: Tie-Breaker
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Tie-Breaker */}
      {step === 'tiebreaker' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            How many total goals will be scored during regular playing time in the entire World Cup?
            This is used to break ties.
          </p>
          <input
            type="number"
            min="0"
            max="500"
            value={tieBreaker}
            onChange={(e) => setTieBreaker(e.target.value)}
            placeholder="e.g., 142"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('multipliers')}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => setStep('confirm')}
              disabled={!canProceedToConfirm}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              Next: Confirm
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm + Pay */}
      {step === 'confirm' && !confirmMutation.isSuccess && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Your Picks</h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {Array.from(selectedTeams.entries())
              .sort((a, b) => (multipliers.get(b[0]) || 0) - (multipliers.get(a[0]) || 0))
              .map(([code]) => {
                const team = teams?.find((t) => t.code === code);
                return (
                  <div
                    key={code}
                    className="flex items-center justify-between rounded bg-sb-turf/50 px-2 py-1"
                  >
                    <span className="truncate">{team?.name || code}</span>
                    <span className="font-mono font-bold text-amber-500">
                      x{multipliers.get(code)}
                    </span>
                  </div>
                );
              })}
          </div>
          <div className="text-xs text-muted-foreground">
            Tie-breaker prediction: <strong>{tieBreaker}</strong> total goals
          </div>

          <div className="rounded-lg border bg-amber-500/5 p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Entry Fee</span>
              <span className="font-semibold">{contest.entryFee} MEDALS</span>
            </div>
            {medalsBalance !== undefined && (
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Your Balance</span>
                <span>{Number(medalsBalance).toLocaleString()} MEDALS</span>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('tiebreaker')}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={entryMutation.isPending || confirmMutation.isPending}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              {entryMutation.isPending || confirmMutation.isPending ? (
                'Processing...'
              ) : (
                <>
                  <Trophy className="mr-1 h-4 w-4" />
                  Pay {contest.entryFee} MEDALS & Enter
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
