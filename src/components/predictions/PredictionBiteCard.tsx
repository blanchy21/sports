'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils/client';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { PredictionOutcomeBar } from './PredictionOutcomeBar';
import { PredictionStakeModal } from './PredictionStakeModal';
import { PredictionSettlementPanel } from './PredictionSettlementPanel';
import { usePredictionStore } from '@/stores/predictionStore';
import { useAuth } from '@/contexts/AuthContext';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { PREDICTION_CONFIG } from '@/lib/predictions/constants';
import { SPORT_CATEGORIES } from '@/types';
import { Trophy, Clock, Loader2, Target, AlertCircle } from 'lucide-react';
import type { PredictionBite } from '@/lib/predictions/types';

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatCountdown(locksAt: string): string {
  const remaining = new Date(locksAt).getTime() - Date.now();
  if (remaining <= 0) return 'Locked';
  if (remaining < 60_000) return '< 1m';

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

interface PredictionBiteCardProps {
  prediction: PredictionBite;
  isNew?: boolean;
}

export function PredictionBiteCard({ prediction, isNew }: PredictionBiteCardProps) {
  const { user, authType, hiveUser } = useAuth();
  const { openStakeModal, stakeModalOpen, stakeOutcomeId, closeStakeModal } = usePredictionStore();

  const [countdown, setCountdown] = useState(() => formatCountdown(prediction.locksAt));

  const hiveUsername =
    hiveUser?.username || user?.hiveUsername || (authType === 'hive' ? user?.username : undefined);
  const isAdmin = hiveUsername ? PREDICTION_CONFIG.ADMIN_ACCOUNTS.includes(hiveUsername) : false;
  const isCreator = hiveUsername === prediction.creatorUsername;
  const canSettle = (isCreator || isAdmin) && prediction.status === 'LOCKED';

  // Map user stakes by outcomeId
  const userStakeMap = useMemo(() => {
    const map = new Map<string, number>();
    prediction.userStakes?.forEach((s) => map.set(s.outcomeId, s.amount));
    return map;
  }, [prediction.userStakes]);

  const totalUserStake = useMemo(
    () => prediction.userStakes?.reduce((sum, s) => sum + s.amount, 0) ?? 0,
    [prediction.userStakes]
  );

  const userPayout = useMemo(
    () =>
      prediction.userStakes
        ?.filter((s) => s.payout != null)
        .reduce((sum, s) => sum + (s.payout ?? 0), 0) ?? 0,
    [prediction.userStakes]
  );

  const sportCategory = SPORT_CATEGORIES.find((s) => s.id === prediction.sportCategory);
  const avatarUrl = getHiveAvatarUrl(prediction.creatorUsername);

  // Countdown timer for OPEN predictions
  useEffect(() => {
    if (prediction.status !== 'OPEN') return;
    const interval = setInterval(() => {
      setCountdown(formatCountdown(prediction.locksAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [prediction.status, prediction.locksAt]);

  const winningOutcome = prediction.outcomes.find((o) => o.id === prediction.winningOutcomeId);

  // The stake modal should only show for this prediction's outcomes
  const activeStakeOutcome =
    stakeModalOpen && stakeOutcomeId
      ? prediction.outcomes.find((o) => o.id === stakeOutcomeId)
      : null;

  return (
    <>
      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-card transition-all',
          'border-l-4 border-l-amber-500',
          isNew && 'duration-500 animate-in fade-in slide-in-from-top-2'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <Avatar
            src={avatarUrl}
            fallback={prediction.creatorUsername}
            alt={prediction.creatorUsername}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">@{prediction.creatorUsername}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(prediction.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {sportCategory && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{sportCategory.icon}</span>
                  {sportCategory.name}
                </span>
              )}
              <StatusBadge status={prediction.status} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="px-4 pt-3">
          <h3 className="text-lg font-semibold leading-snug">{prediction.title}</h3>
        </div>

        {/* Outcome bars */}
        <div className="space-y-2 px-4 pt-3">
          {prediction.outcomes.map((outcome) => (
            <PredictionOutcomeBar
              key={outcome.id}
              outcome={outcome}
              totalPool={prediction.totalPool}
              isSelected={userStakeMap.has(outcome.id)}
              isWinner={outcome.isWinner}
              isClickable={prediction.status === 'OPEN'}
              onClick={() => openStakeModal(prediction.id, outcome.id)}
              userStake={userStakeMap.get(outcome.id)}
            />
          ))}
        </div>

        {/* Pool display */}
        <div className="flex items-center gap-2 px-4 pt-3 text-sm text-muted-foreground">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span>
            Total Pool:{' '}
            <span className="font-semibold text-foreground">{prediction.totalPool} MEDALS</span>
          </span>
        </div>

        {/* User stake summary */}
        {totalUserStake > 0 && (
          <div className="mx-4 mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
            <span className="text-amber-700 dark:text-amber-400">
              Your stake: {totalUserStake} MEDALS
              {prediction.status === 'SETTLED' && userPayout > 0 && (
                <> — Won {userPayout.toFixed(2)} MEDALS</>
              )}
              {prediction.status === 'SETTLED' && userPayout === 0 && totalUserStake > 0 && (
                <> — No payout</>
              )}
            </span>
          </div>
        )}

        {/* Status-dependent footer */}
        <div className="px-4 pb-4 pt-3">
          {prediction.status === 'OPEN' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Locks in {countdown}</span>
              </div>
              <Button
                size="sm"
                className="bg-amber-500 text-white hover:bg-amber-600"
                onClick={() => {
                  const firstOutcome = prediction.outcomes[0];
                  if (firstOutcome) openStakeModal(prediction.id, firstOutcome.id);
                }}
              >
                <Target className="mr-1.5 h-3.5 w-3.5" />
                Place Stake
              </Button>
            </div>
          )}

          {prediction.status === 'LOCKED' && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-700 dark:text-blue-400">
              <Clock className="h-4 w-4" />
              Predictions Locked - In Progress
            </div>
          )}

          {prediction.status === 'SETTLING' && (
            <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-2 text-sm text-purple-700 dark:text-purple-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Settling...
            </div>
          )}

          {prediction.status === 'SETTLED' && winningOutcome && (
            <div className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              Winner: <span className="font-semibold">{winningOutcome.label}</span>
            </div>
          )}

          {(prediction.status === 'VOID' || prediction.status === 'REFUNDED') && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>Voided{prediction.voidReason ? `: ${prediction.voidReason}` : ''}</span>
            </div>
          )}
        </div>

        {/* Settlement panel for creators/admins */}
        {canSettle && <PredictionSettlementPanel prediction={prediction} />}
      </div>

      {/* Stake modal - only render if an outcome from this prediction is selected */}
      {activeStakeOutcome && (
        <PredictionStakeModal
          prediction={prediction}
          outcomeId={activeStakeOutcome.id}
          isOpen={stakeModalOpen}
          onClose={closeStakeModal}
        />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    OPEN: { label: 'Open', className: 'bg-green-500/15 text-green-700 dark:text-green-400' },
    LOCKED: { label: 'Locked', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
    SETTLING: {
      label: 'Settling',
      className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    },
    SETTLED: { label: 'Settled', className: 'bg-gray-500/15 text-gray-700 dark:text-gray-400' },
    VOID: { label: 'Void', className: 'bg-red-500/15 text-red-700 dark:text-red-400' },
    REFUNDED: { label: 'Refunded', className: 'bg-red-500/15 text-red-700 dark:text-red-400' },
  };

  const c = config[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', c.className)}>
      {c.label}
    </span>
  );
}
