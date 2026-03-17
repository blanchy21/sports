'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { useLmsMyPick, useLmsPick } from '@/lib/react-query/queries/useLms';
import { LmsTeamSelector } from './LmsTeamSelector';
import { LmsPickHistory } from './LmsPickHistory';
import { PL_TEAMS_2526 } from '@/lib/lms/teams';
import type { LmsCompetitionResponse } from '@/lib/lms/types';

interface LmsMyPickProps {
  competitionId: string;
  competition: LmsCompetitionResponse;
}

function getTimeRemaining(dateStr: string): { text: string; urgent: boolean } | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return { text: `${days}d ${hours}h remaining`, urgent: days <= 1 };
  if (hours > 0) return { text: `${hours}h ${mins}m remaining`, urgent: hours <= 6 };
  return { text: `${mins}m remaining`, urgent: true };
}

export function LmsMyPick({ competitionId, competition }: LmsMyPickProps) {
  const { data: pickData, isLoading } = useLmsMyPick(competitionId);
  const pickMutation = useLmsPick(competitionId);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const deadline = competition.currentGameweekData?.deadline;
  const isDeadlinePassed = deadline ? new Date(deadline).getTime() < Date.now() : false;
  const timeInfo = useMemo(() => (deadline ? getTimeRemaining(deadline) : null), [deadline]);

  const handleConfirm = useCallback(() => {
    if (!selectedTeam) return;
    pickMutation.mutate(
      { gameweek: competition.currentGameweek, teamPicked: selectedTeam },
      {
        onSuccess: () => {
          setSelectedTeam(null);
        },
      }
    );
  }, [selectedTeam, pickMutation, competition.currentGameweek]);

  // Not entered or eliminated
  if (!pickData?.entry || pickData.entry.status !== 'alive') {
    return null;
  }

  const currentPick = pickData.currentPick?.teamPicked ?? null;
  const usedTeams = pickData.entry.usedTeams;
  const fixtures = competition.currentGameweekData?.fixtures ?? [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-sb-stadium p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-sb-turf" />
          <div className="h-4 w-64 rounded bg-sb-turf/60" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-sb-turf/40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-sb-stadium p-5">
        {/* Header with deadline */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Your Pick — GW{competition.currentGameweek}</h3>
          {timeInfo && (
            <span
              className={cn(
                'flex items-center gap-1.5 text-sm',
                timeInfo.urgent ? 'font-semibold text-orange-500' : 'text-muted-foreground'
              )}
            >
              <Clock className={cn('h-3.5 w-3.5', timeInfo.urgent && 'animate-pulse')} />
              {timeInfo.text}
            </span>
          )}
        </div>

        {/* Current pick badge */}
        {currentPick && !isDeadlinePassed && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
            <CheckCircle2 className="h-4 w-4" />
            Your pick: {currentPick}
            {pickData.currentPick?.isAutoPick && (
              <span className="text-xs font-normal text-muted-foreground">(auto-pick)</span>
            )}
          </div>
        )}

        {/* Team selector */}
        {!isDeadlinePassed && (
          <LmsTeamSelector
            fixtures={fixtures}
            usedTeams={usedTeams}
            currentPick={currentPick}
            onSelect={setSelectedTeam}
            onConfirm={handleConfirm}
            selectedTeam={selectedTeam}
            submitting={pickMutation.isPending}
            disabled={isDeadlinePassed}
            allTeams={[...PL_TEAMS_2526]}
          />
        )}

        {isDeadlinePassed && currentPick && (
          <div className="rounded-xl bg-sb-turf/30 p-4 text-center">
            <div className="text-sm text-muted-foreground">Your pick is locked</div>
            <div className="mt-1 text-lg font-bold">{currentPick}</div>
          </div>
        )}

        {isDeadlinePassed && !currentPick && (
          <div className="rounded-xl bg-red-500/5 p-4 text-center text-sm text-red-600 ring-1 ring-red-500/10 dark:text-red-400">
            No pick submitted. An auto-pick will be assigned.
          </div>
        )}

        {/* Mutation error */}
        {pickMutation.isError && (
          <div className="mt-3 rounded-lg bg-red-500/5 p-3 text-sm text-red-600 ring-1 ring-red-500/10 dark:text-red-400">
            {pickMutation.error.message}
          </div>
        )}
      </div>

      {/* Pick history */}
      {pickData.history.length > 0 && <LmsPickHistory history={pickData.history} />}
    </div>
  );
}
