'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Trophy, Plus, Minus, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { SPORT_CATEGORIES } from '@/types';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { usePlaceStake } from '@/hooks/usePredictionStake';
import { logger } from '@/lib/logger';

interface PredictionComposerProps {
  onSuccess?: (bite: null) => void;
  onError?: (error: string) => void;
}

export function PredictionComposer({ onSuccess, onError }: PredictionComposerProps) {
  const { user, hiveUser, touchSession } = useAuth();
  const placeStakeMutation = usePlaceStake();

  const hiveUsername = hiveUser?.username || user?.hiveUsername || undefined;

  const [isPublishing, setIsPublishing] = useState(false);
  const [predictionTitle, setPredictionTitle] = useState('');
  const [predictionOutcomes, setPredictionOutcomes] = useState<string[]>(['', '']);
  const [predictionLocksAt, setPredictionLocksAt] = useState('');
  const [predictionSportCategory, setPredictionSportCategory] = useState('');
  const [creatorStakeOutcome, setCreatorStakeOutcome] = useState(0);
  const [creatorStakeAmount, setCreatorStakeAmount] = useState<number>(
    PREDICTION_CONFIG.MIN_CREATOR_STAKE
  );
  const [showPredictionSportPicker, setShowPredictionSportPicker] = useState(false);

  const addOutcome = () => {
    if (predictionOutcomes.length < PREDICTION_CONFIG.MAX_OUTCOMES) {
      setPredictionOutcomes([...predictionOutcomes, '']);
    }
  };

  const removeOutcome = (index: number) => {
    if (predictionOutcomes.length > PREDICTION_CONFIG.MIN_OUTCOMES) {
      const updated = predictionOutcomes.filter((_, i) => i !== index);
      setPredictionOutcomes(updated);
      if (creatorStakeOutcome >= updated.length) {
        setCreatorStakeOutcome(0);
      }
    }
  };

  const updateOutcome = (index: number, value: string) => {
    const updated = [...predictionOutcomes];
    updated[index] = value.slice(0, PREDICTION_CONFIG.MAX_OUTCOME_LABEL_LENGTH);
    setPredictionOutcomes(updated);
  };

  const canPublishPrediction =
    predictionTitle.trim().length > 0 &&
    predictionOutcomes.filter((o) => o.trim().length > 0).length >=
      PREDICTION_CONFIG.MIN_OUTCOMES &&
    predictionLocksAt &&
    creatorStakeAmount >= PREDICTION_CONFIG.MIN_CREATOR_STAKE &&
    !isPublishing;

  const handlePublishPrediction = useCallback(async () => {
    if (!user || !hiveUsername) {
      onError?.('Please sign in with a Hive wallet to create predictions');
      return;
    }

    // Validate
    if (!predictionTitle.trim()) {
      onError?.('Prediction title is required');
      return;
    }
    if (predictionTitle.length > PREDICTION_CONFIG.MAX_TITLE_LENGTH) {
      onError?.(`Title must be under ${PREDICTION_CONFIG.MAX_TITLE_LENGTH} characters`);
      return;
    }
    const validOutcomes = predictionOutcomes.filter((o) => o.trim().length > 0);
    if (validOutcomes.length < PREDICTION_CONFIG.MIN_OUTCOMES) {
      onError?.(`At least ${PREDICTION_CONFIG.MIN_OUTCOMES} outcomes are required`);
      return;
    }
    if (!predictionLocksAt) {
      onError?.('Lock time is required');
      return;
    }
    const locksAtDate = new Date(predictionLocksAt);
    if (locksAtDate.getTime() <= Date.now() + PREDICTION_CONFIG.MIN_LOCK_TIME_MS) {
      onError?.('Lock time must be at least 15 minutes in the future');
      return;
    }
    if (creatorStakeAmount < PREDICTION_CONFIG.MIN_CREATOR_STAKE) {
      onError?.(`Creator stake must be at least ${PREDICTION_CONFIG.MIN_CREATOR_STAKE} MEDALS`);
      return;
    }

    setIsPublishing(true);
    touchSession();

    try {
      // Step 1: Create prediction via API
      const createRes = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: predictionTitle.trim(),
          outcomes: validOutcomes.map((o) => o.trim()),
          sportCategory: predictionSportCategory || undefined,
          locksAt: locksAtDate.toISOString(),
          creatorStake: {
            outcomeIndex: creatorStakeOutcome,
            amount: creatorStakeAmount,
          },
        }),
      });

      const createData = await createRes.json();
      if (!createData.success) {
        const errMsg =
          typeof createData.error === 'string' ? createData.error : createData.error?.message;
        throw new Error(errMsg || 'Failed to create prediction');
      }

      const prediction = createData.data?.prediction;
      if (!prediction) {
        throw new Error('No prediction returned');
      }

      // Step 2: Place creator's initial stake (if the API doesn't handle it automatically)
      if (createData.data?.stakeRequired && prediction.outcomes[creatorStakeOutcome]) {
        try {
          await placeStakeMutation.mutateAsync({
            predictionId: prediction.id,
            outcomeId: prediction.outcomes[creatorStakeOutcome].id,
            amount: creatorStakeAmount,
          });
        } catch (stakeErr) {
          logger.error('Creator stake failed', 'PredictionComposer', stakeErr);
          // Prediction was created but stake failed - still count as success
          onError?.('Prediction created but initial stake failed. You can stake separately.');
        }
      }

      // Reset prediction form
      setPredictionTitle('');
      setPredictionOutcomes(['', '']);
      setPredictionLocksAt('');
      setPredictionSportCategory('');
      setCreatorStakeOutcome(0);
      setCreatorStakeAmount(PREDICTION_CONFIG.MIN_CREATOR_STAKE);

      // No optimistic bite for predictions — they'll appear via feed refetch
      onSuccess?.(null);
    } catch (error) {
      logger.error('Error creating prediction', 'PredictionComposer', error);
      onError?.(error instanceof Error ? error.message : 'Failed to create prediction');
    } finally {
      setIsPublishing(false);
    }
  }, [
    user,
    hiveUsername,
    predictionTitle,
    predictionOutcomes,
    predictionLocksAt,
    predictionSportCategory,
    creatorStakeOutcome,
    creatorStakeAmount,
    touchSession,
    placeStakeMutation,
    onSuccess,
    onError,
  ]);

  return (
    <div className="space-y-4 p-4">
      {/* Title */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Prediction title
        </label>
        <input
          type="text"
          value={predictionTitle}
          onChange={(e) =>
            setPredictionTitle(e.target.value.slice(0, PREDICTION_CONFIG.MAX_TITLE_LENGTH))
          }
          placeholder="e.g. Who will win the match?"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
          disabled={isPublishing}
        />
        <div className="mt-1 text-right text-xs text-muted-foreground">
          {predictionTitle.length}/{PREDICTION_CONFIG.MAX_TITLE_LENGTH}
        </div>
      </div>

      {/* Outcomes */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Outcomes ({predictionOutcomes.length}/{PREDICTION_CONFIG.MAX_OUTCOMES})
        </label>
        <div className="space-y-2">
          {predictionOutcomes.map((outcome, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={outcome}
                onChange={(e) => updateOutcome(i, e.target.value)}
                placeholder={`Outcome ${i + 1}`}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
                disabled={isPublishing}
              />
              {predictionOutcomes.length > PREDICTION_CONFIG.MIN_OUTCOMES && (
                <button
                  type="button"
                  onClick={() => removeOutcome(i)}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {predictionOutcomes.length < PREDICTION_CONFIG.MAX_OUTCOMES && (
          <button
            type="button"
            onClick={addOutcome}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning transition-colors hover:text-warning/80"
          >
            <Plus className="h-3.5 w-3.5" />
            Add outcome
          </button>
        )}
      </div>

      {/* Sport category */}
      <div className="relative">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Sport category
        </label>
        <button
          type="button"
          onClick={() => setShowPredictionSportPicker(!showPredictionSportPicker)}
          className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm"
        >
          {predictionSportCategory ? (
            <span className="flex items-center gap-1.5">
              {SPORT_CATEGORIES.find((s) => s.id === predictionSportCategory)?.icon}
              {SPORT_CATEGORIES.find((s) => s.id === predictionSportCategory)?.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Select sport (optional)</span>
          )}
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </button>
        {showPredictionSportPicker && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-card p-1.5 shadow-lg">
            {SPORT_CATEGORIES.map((sport) => (
              <button
                key={sport.id}
                onClick={() => {
                  setPredictionSportCategory(sport.id);
                  setShowPredictionSportPicker(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                  predictionSportCategory === sport.id && 'bg-amber-500/10 text-amber-600'
                )}
              >
                <span>{sport.icon}</span>
                <span>{sport.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lock time */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Locks at
        </label>
        <input
          type="datetime-local"
          value={predictionLocksAt}
          onChange={(e) => setPredictionLocksAt(e.target.value)}
          min={new Date(Date.now() + PREDICTION_CONFIG.MIN_LOCK_TIME_MS).toISOString().slice(0, 16)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
          disabled={isPublishing}
        />
      </div>

      {/* Creator's initial stake */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Your initial stake
        </label>
        {/* Pick outcome */}
        <div className="mb-2 space-y-1.5">
          {predictionOutcomes.map(
            (outcome, i) =>
              outcome.trim() && (
                <label
                  key={i}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                    creatorStakeOutcome === i
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <input
                    type="radio"
                    name="creatorStakeOutcome"
                    checked={creatorStakeOutcome === i}
                    onChange={() => setCreatorStakeOutcome(i)}
                    className="accent-amber-500"
                  />
                  <span>{outcome}</span>
                </label>
              )
          )}
        </div>
        {/* Stake amount quick buttons */}
        <div className="flex gap-2">
          {([25, 50, 100, 250] as const).map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setCreatorStakeAmount(amt)}
              className={cn(
                'flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors',
                creatorStakeAmount === amt
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {amt}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={creatorStakeAmount}
          onChange={(e) => setCreatorStakeAmount(Math.max(0, parseInt(e.target.value) || 0))}
          min={PREDICTION_CONFIG.MIN_CREATOR_STAKE}
          max={PREDICTION_CONFIG.MAX_STAKE}
          className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
          disabled={isPublishing}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Min: {PREDICTION_CONFIG.MIN_CREATOR_STAKE} MEDALS
        </p>
      </div>

      {/* Publish button */}
      <Button
        onClick={handlePublishPrediction}
        disabled={!canPublishPrediction}
        className="w-full bg-amber-500 font-semibold text-white hover:bg-amber-600"
      >
        {isPublishing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Target className="mr-2 h-4 w-4" />
            Create Prediction
          </>
        )}
      </Button>
    </div>
  );
}
