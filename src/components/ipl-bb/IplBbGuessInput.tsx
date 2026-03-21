'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Minus, Plus, Lock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { GUESS_MIN, GUESS_MAX, IPL_TEAMS } from '@/lib/ipl-bb/utils';
import type { IplBbMatchDetail } from '@/lib/ipl-bb/types';

interface IplBbGuessInputProps {
  match: IplBbMatchDetail;
  existingGuess?: number | null;
  existingPointsScored?: number | null;
  existingIsBust?: boolean | null;
  onSubmit: (matchId: string, guess: number) => Promise<void>;
  isSubmitting?: boolean;
}

type PickState = 'no-pick' | 'pick-submitted' | 'locked' | 'resolved';

function getPickState(
  match: IplBbMatchDetail,
  existingGuess: number | null | undefined,
  isDeadlinePassed: boolean
): PickState {
  if (match.status === 'resolved') return 'resolved';
  if (isDeadlinePassed || match.status === 'locked') return 'locked';
  if (existingGuess != null) return 'pick-submitted';
  return 'no-pick';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Locked';
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((ms % (1000 * 60)) / 1000);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const IplBbGuessInput = React.memo(function IplBbGuessInput({
  match,
  existingGuess,
  existingPointsScored,
  existingIsBust,
  onSubmit,
  isSubmitting,
}: IplBbGuessInputProps) {
  const [guess, setGuess] = useState<number>(existingGuess ?? 30);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);

  // Countdown timer
  useEffect(() => {
    const kickoff = new Date(match.kickoffTime).getTime();

    function tick() {
      const remaining = kickoff - Date.now();
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        setIsDeadlinePassed(true);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match.kickoffTime]);

  // Sync external guess changes
  useEffect(() => {
    if (existingGuess != null) setGuess(existingGuess);
  }, [existingGuess]);

  const pickState = getPickState(match, existingGuess, isDeadlinePassed);

  const increment = useCallback(() => setGuess((g) => Math.min(g + 1, GUESS_MAX)), []);
  const decrement = useCallback(() => setGuess((g) => Math.max(g - 1, GUESS_MIN)), []);

  const handleSubmit = useCallback(async () => {
    await onSubmit(match.id, guess);
    setIsEditing(false);
  }, [onSubmit, match.id, guess]);

  const homeTeam = IPL_TEAMS[match.homeTeam] || { short: match.homeTeam, color: '#666' };
  const awayTeam = IPL_TEAMS[match.awayTeam] || { short: match.awayTeam, color: '#666' };

  const kickoffDate = new Date(match.kickoffTime);
  const timeStr = kickoffDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = kickoffDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={cn(
        'rounded-xl border bg-sb-stadium p-4 transition-colors',
        pickState === 'resolved' && existingIsBust === false && 'border-green-500/20',
        pickState === 'resolved' && existingIsBust === true && 'border-red-500/20'
      )}
    >
      {/* Match header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Match {match.matchNumber}
          </span>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <span className="text-xs text-muted-foreground">{dateStr}</span>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <span className="text-xs text-muted-foreground">{timeStr}</span>
        </div>
        {pickState !== 'resolved' && !isDeadlinePassed && timeRemaining > 0 && (
          <span
            className={cn(
              'text-xs font-medium',
              timeRemaining < 3600000 ? 'text-orange-500' : 'text-muted-foreground'
            )}
          >
            {formatCountdown(timeRemaining)}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="mb-3 flex items-center justify-center gap-3 text-center">
        <div className="flex-1">
          <div
            className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: homeTeam.color }}
          >
            {homeTeam.short}
          </div>
          <div className="text-xs text-muted-foreground">{match.homeTeam}</div>
        </div>
        <span className="text-sm font-bold text-muted-foreground">vs</span>
        <div className="flex-1">
          <div
            className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: awayTeam.color }}
          >
            {awayTeam.short}
          </div>
          <div className="text-xs text-muted-foreground">{match.awayTeam}</div>
        </div>
      </div>

      {match.venue && (
        <div className="mb-3 text-center text-xs text-muted-foreground/70">{match.venue}</div>
      )}

      {/* State-dependent UI */}
      {pickState === 'no-pick' && (
        <div>
          <div className="mb-2 text-center text-xs font-medium text-muted-foreground">
            How many boundaries (4s + 6s)?
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={decrement}
              disabled={isSubmitting}
              className="flex h-10 w-10 items-center justify-center rounded-lg border bg-sb-turf transition-colors hover:bg-sb-turf/80 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={guess}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= GUESS_MIN && v <= GUESS_MAX) setGuess(v);
              }}
              min={GUESS_MIN}
              max={GUESS_MAX}
              className="h-12 w-20 rounded-lg border bg-sb-turf text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <button
              onClick={increment}
              disabled={isSubmitting}
              className="flex h-10 w-10 items-center justify-center rounded-lg border bg-sb-turf transition-colors hover:bg-sb-turf/80 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mt-3 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Guess'}
          </button>
        </div>
      )}

      {pickState === 'pick-submitted' && !isEditing && (
        <div className="text-center">
          <div className="mb-1 text-xs text-muted-foreground">Your guess</div>
          <div className="text-3xl font-bold">{existingGuess}</div>
          <button
            onClick={() => {
              setGuess(existingGuess ?? 30);
              setIsEditing(true);
            }}
            className="mt-2 text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            Update before {timeStr}
          </button>
        </div>
      )}

      {pickState === 'pick-submitted' && isEditing && (
        <div>
          <div className="mb-2 text-center text-xs font-medium text-muted-foreground">
            Update your guess
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={decrement}
              disabled={isSubmitting}
              className="flex h-10 w-10 items-center justify-center rounded-lg border bg-sb-turf transition-colors hover:bg-sb-turf/80 disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={guess}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= GUESS_MIN && v <= GUESS_MAX) setGuess(v);
              }}
              min={GUESS_MIN}
              max={GUESS_MAX}
              className="h-12 w-20 rounded-lg border bg-sb-turf text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <button
              onClick={increment}
              disabled={isSubmitting}
              className="flex h-10 w-10 items-center justify-center rounded-lg border bg-sb-turf transition-colors hover:bg-sb-turf/80 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors hover:bg-sb-turf"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      )}

      {pickState === 'locked' && (
        <div className="text-center">
          <div className="mb-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Locked
          </div>
          {existingGuess != null ? (
            <div className="text-3xl font-bold">{existingGuess}</div>
          ) : (
            <div className="text-sm text-muted-foreground">No guess submitted</div>
          )}
        </div>
      )}

      {pickState === 'resolved' && (
        <div className="text-center">
          {existingGuess != null ? (
            <>
              <div
                className={cn(
                  'mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full',
                  existingIsBust ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                )}
              >
                {existingIsBust ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />}
              </div>
              <div className="mb-1 text-sm font-semibold">
                {existingIsBust ? 'Bust' : 'Hit'} &middot;{' '}
                <span className={existingIsBust ? 'text-red-500' : 'text-green-500'}>
                  +{existingPointsScored ?? 0} pts
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Your guess: {existingGuess} &middot; Actual: {match.actualBoundaries}
                {match.fours != null && match.sixes != null && (
                  <span>
                    {' '}
                    ({match.fours} fours, {match.sixes} sixes)
                  </span>
                )}
              </div>
            </>
          ) : (
            <div>
              <div className="mb-1 text-sm text-muted-foreground">No guess submitted</div>
              <div className="text-xs text-muted-foreground">
                Actual: {match.actualBoundaries} boundaries
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
