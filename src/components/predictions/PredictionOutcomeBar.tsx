'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import type { PredictionOutcomeResponse } from '@/lib/predictions/types';

interface PredictionOutcomeBarProps {
  outcome: PredictionOutcomeResponse;
  totalPool: number;
  isSelected?: boolean;
  isWinner?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  userStake?: number;
}

export function PredictionOutcomeBar({
  outcome,
  totalPool,
  isSelected = false,
  isWinner = false,
  isClickable = false,
  onClick,
  userStake,
}: PredictionOutcomeBarProps) {
  const percentage = totalPool > 0 ? outcome.percentage : 0;

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        'relative w-full overflow-hidden rounded-lg border p-3 text-left transition-all',
        isClickable && 'cursor-pointer hover:border-warning/60 hover:bg-warning/5',
        !isClickable && 'cursor-default',
        isWinner && 'border-success bg-success/10',
        isSelected && !isWinner && 'border-warning bg-warning/10',
        !isWinner && !isSelected && 'border-border bg-card'
      )}
    >
      {/* Background fill bar */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 transition-all duration-500',
          isWinner ? 'bg-success/15' : isSelected ? 'bg-warning/10' : 'bg-muted/50'
        )}
        style={{ width: `${Math.max(percentage, 2)}%` }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {isWinner && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-xs text-white">
              &#10003;
            </span>
          )}
          <span
            className={cn(
              'truncate text-sm font-medium',
              isWinner && 'text-success',
              isSelected && !isWinner && 'text-warning'
            )}
          >
            {outcome.label}
          </span>
          {userStake != null && userStake > 0 && (
            <span className="shrink-0 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
              {userStake} staked
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>{outcome.totalStaked} MEDALS</span>
          <span className="hidden sm:inline">
            {outcome.backerCount} {outcome.backerCount === 1 ? 'backer' : 'backers'}
          </span>
          <span className={cn('font-semibold', isWinner ? 'text-success' : 'text-foreground')}>
            {outcome.odds.toFixed(2)}x
          </span>
        </div>
      </div>

      {/* Percentage label */}
      <div className="relative mt-1 text-right">
        <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
      </div>
    </button>
  );
}
