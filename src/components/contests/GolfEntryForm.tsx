'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Check, ChevronRight, ChevronLeft, Trophy, AlertCircle, Search, X } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { useContestTeams, useContestEntry, useContestEntryConfirm } from '@/lib/react-query/queries/useContests';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useAuth } from '@/contexts/AuthContext';
import { useMedalsBalance } from '@/lib/react-query/queries/useMedals';
import { useContestStore } from '@/stores/contestStore';
import { GOLF_FANTASY_CONFIG } from '@/lib/contests/constants';
import { cn } from '@/lib/utils/client';
import type { ContestResponse } from '@/lib/contests/types';

type Step = 'golfers' | 'tiebreaker' | 'confirm';

export function GolfEntryForm({ contest }: { contest: ContestResponse }) {
  const slug = contest.slug;
  const { data: teams } = useContestTeams(slug);
  const { user, hiveUser } = useAuth();
  const walletUsername = hiveUser?.username || user?.hiveUsername;
  const { data: medalsBalance } = useMedalsBalance(walletUsername);
  const { broadcast } = useBroadcast();
  const entryMutation = useContestEntry(slug);
  const confirmMutation = useContestEntryConfirm(slug);
  const { setIsEntering } = useContestStore();

  const [step, setStep] = useState<Step>('golfers');
  const [selectedGolfers, setSelectedGolfers] = useState<Set<string>>(new Set());
  const [tieBreaker, setTieBreaker] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sort golfers by odds (favorites first = lowest odds)
  const sortedTeams = useMemo(() => {
    if (!teams) return [];
    return [...teams].sort((a, b) => (a.odds ?? 9999) - (b.odds ?? 9999));
  }, [teams]);

  // Filter by search
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return sortedTeams;
    const q = searchQuery.toLowerCase();
    return sortedTeams.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [sortedTeams, searchQuery]);

  // Odds map for quick lookup
  const oddsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (teams) {
      for (const t of teams) {
        if (t.odds != null) map.set(t.code, t.odds);
      }
    }
    return map;
  }, [teams]);

  const combinedOdds = useMemo(() => {
    let total = 0;
    for (const code of selectedGolfers) {
      total += oddsMap.get(code) ?? 0;
    }
    return total;
  }, [selectedGolfers, oddsMap]);

  const toggleGolfer = useCallback((code: string) => {
    setSelectedGolfers((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        if (next.size >= GOLF_FANTASY_CONFIG.PICKS_COUNT) return prev;
        next.add(code);
      }
      return next;
    });
  }, []);

  const canProceedToTieBreaker =
    selectedGolfers.size === GOLF_FANTASY_CONFIG.PICKS_COUNT &&
    combinedOdds >= GOLF_FANTASY_CONFIG.MIN_COMBINED_ODDS;

  const tieBreakerNum = Number(tieBreaker);
  const canProceedToConfirm =
    tieBreaker !== '' &&
    Number.isInteger(tieBreakerNum) &&
    tieBreakerNum >= GOLF_FANTASY_CONFIG.TIE_BREAKER_MIN &&
    tieBreakerNum <= GOLF_FANTASY_CONFIG.TIE_BREAKER_MAX;

  const buildEntryData = useCallback(() => {
    const picks = Array.from(selectedGolfers).map((code) => ({
      golferCode: code,
      odds: oddsMap.get(code) ?? 0,
    }));
    return { picks, tieBreaker: Number(tieBreaker) };
  }, [selectedGolfers, oddsMap, tieBreaker]);

  const handleSubmit = async () => {
    if (!walletUsername) return;

    setError(null);
    setIsEntering(true);

    try {
      const entryData = buildEntryData();

      // Step 1: Get operation + token from server
      const res = await entryMutation.mutateAsync(entryData);
      const { operation, entryToken } = res.data;

      // Step 2: Broadcast the MEDALS transfer
      const broadcastResult = await broadcast(
        [['custom_json', operation]],
        'active'
      );

      if (!broadcastResult.success) {
        throw new Error(broadcastResult.error || 'Broadcast failed');
      }

      // Step 3: Confirm entry
      await confirmMutation.mutateAsync({
        entryToken,
        txId: broadcastResult.transactionId,
        entryData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit entry');
    } finally {
      setIsEntering(false);
    }
  };

  if (confirmMutation.isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 mx-auto mb-3">
          <Check className="h-6 w-6 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold mb-1">You&apos;re In!</h3>
        <p className="text-sm text-muted-foreground">
          Your Masters entry has been confirmed. Good luck!
        </p>
      </div>
    );
  }

  const stepLabels = ['Pick Golfers', 'Tie-Breaker', 'Confirm'];
  const steps: Step[] = ['golfers', 'tiebreaker', 'confirm'];

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <span
              className={cn(
                'px-2 py-1 rounded-full',
                step === s
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {stepLabels[i]}
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

      {/* Step 1: Pick Golfers */}
      {step === 'golfers' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pick 3 golfers. Combined odds must be at least {GOLF_FANTASY_CONFIG.MIN_COMBINED_ODDS}/1.
          </p>

          {/* Combined odds display */}
          <div
            className={cn(
              'rounded-lg border p-3 text-center',
              selectedGolfers.size === GOLF_FANTASY_CONFIG.PICKS_COUNT &&
                combinedOdds < GOLF_FANTASY_CONFIG.MIN_COMBINED_ODDS
                ? 'border-destructive/50 bg-destructive/5'
                : combinedOdds >= GOLF_FANTASY_CONFIG.MIN_COMBINED_ODDS
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'bg-muted/30'
            )}
          >
            <div className="text-xs text-muted-foreground mb-0.5">Combined Odds</div>
            <div className="text-xl font-bold">
              {combinedOdds}/1
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedGolfers.size}/{GOLF_FANTASY_CONFIG.PICKS_COUNT} selected
              {selectedGolfers.size === GOLF_FANTASY_CONFIG.PICKS_COUNT &&
                combinedOdds < GOLF_FANTASY_CONFIG.MIN_COMBINED_ODDS && (
                  <span className="text-destructive ml-1">
                    (need {GOLF_FANTASY_CONFIG.MIN_COMBINED_ODDS}/1 minimum)
                  </span>
                )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search golfers..."
              className="w-full rounded-lg border bg-background pl-9 pr-8 py-2 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Golfer list */}
          <div className="max-h-80 overflow-y-auto space-y-1 rounded-lg border p-2">
            {filteredTeams.map((team) => {
              const isSelected = selectedGolfers.has(team.code);
              const isFull = selectedGolfers.size >= GOLF_FANTASY_CONFIG.PICKS_COUNT;
              return (
                <button
                  key={team.code}
                  onClick={() => toggleGolfer(team.code)}
                  disabled={!isSelected && isFull}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                    isSelected
                      ? 'bg-green-500/10 border border-green-500/50'
                      : isFull
                        ? 'opacity-40'
                        : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                    <span className={cn('font-medium', isSelected && 'text-green-600 dark:text-green-400')}>
                      {team.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {team.odds}/1
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep('tiebreaker')}
              disabled={!canProceedToTieBreaker}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Next: Tie-Breaker
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Tie-Breaker */}
      {step === 'tiebreaker' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Predict the winning score (relative to par). For example, -12 means 12 under par.
            This is used to break ties.
          </p>
          <input
            type="number"
            min={GOLF_FANTASY_CONFIG.TIE_BREAKER_MIN}
            max={GOLF_FANTASY_CONFIG.TIE_BREAKER_MAX}
            value={tieBreaker}
            onChange={(e) => setTieBreaker(e.target.value)}
            placeholder="e.g., -12"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Range: {GOLF_FANTASY_CONFIG.TIE_BREAKER_MIN} to +{GOLF_FANTASY_CONFIG.TIE_BREAKER_MAX}
          </p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('golfers')}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => setStep('confirm')}
              disabled={!canProceedToConfirm}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Next: Confirm
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Pay */}
      {step === 'confirm' && !confirmMutation.isSuccess && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Your Picks</h4>
          <div className="space-y-1">
            {Array.from(selectedGolfers).map((code) => {
              const team = teams?.find((t) => t.code === code);
              return (
                <div key={code} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-medium">{team?.name || code}</span>
                  <span className="font-mono text-xs text-muted-foreground">{team?.odds}/1</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-sm rounded-lg bg-green-500/5 border border-green-500/30 px-3 py-2">
            <span className="text-muted-foreground">Combined Odds</span>
            <span className="font-bold text-green-600 dark:text-green-400">{combinedOdds}/1</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Winning score prediction: <strong>{Number(tieBreaker) >= 0 ? `+${tieBreaker}` : tieBreaker}</strong> (relative to par)
          </div>

          <div className="rounded-lg border bg-green-500/5 p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Entry Fee</span>
              <span className="font-semibold">{contest.entryFee} MEDALS</span>
            </div>
            {medalsBalance !== undefined && (
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
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
              className="bg-green-600 hover:bg-green-700 text-white"
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
