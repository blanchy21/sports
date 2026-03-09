'use client';

import React from 'react';
import { Check, Lock, Ban } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { Button } from '@/components/core/Button';
import { getFixtureForTeam } from '@/lib/lms/utils';
import type { LmsFixture } from '@/lib/lms/types';

interface LmsTeamSelectorProps {
  fixtures: LmsFixture[];
  usedTeams: string[];
  currentPick: string | null;
  onSelect: (team: string) => void;
  onConfirm: () => void;
  selectedTeam: string | null;
  submitting: boolean;
  disabled: boolean;
  allTeams: string[];
}

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export function LmsTeamSelector({
  fixtures,
  usedTeams,
  currentPick,
  onSelect,
  onConfirm,
  selectedTeam,
  submitting,
  disabled,
  allTeams,
}: LmsTeamSelectorProps) {
  const usedSet = new Set(usedTeams);

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-bold">Select Your Team</h3>
        <p className="text-sm text-muted-foreground">
          Pick one team to win this gameweek. Each team can only be used once.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {allTeams.map((team) => {
          const isUsed = usedSet.has(team) && team !== currentPick;
          const isCurrentPick = team === currentPick;
          const isSelected = team === selectedTeam;
          const fixture = getFixtureForTeam(team, fixtures);
          const canSelect = !isUsed && !disabled;

          return (
            <button
              key={team}
              onClick={() => canSelect && onSelect(team)}
              disabled={!canSelect}
              className={cn(
                'relative rounded-xl border p-3 text-left transition-all duration-150',
                // Default state
                canSelect &&
                  !isSelected &&
                  !isCurrentPick &&
                  'border-border bg-card hover:border-amber-500/40 hover:bg-amber-500/5',
                // Selected state
                isSelected && 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30',
                // Already picked this GW
                isCurrentPick && !isSelected && 'border-amber-500/30 bg-amber-500/5',
                // Used in previous GW
                isUsed && 'cursor-not-allowed border-border/50 bg-muted/30 opacity-50',
                // Disabled (deadline passed)
                disabled && !isUsed && 'cursor-not-allowed opacity-60'
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* Used indicator */}
              {isUsed && (
                <div className="absolute right-2 top-2">
                  <Ban className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              <div className="text-sm font-bold leading-tight">{team}</div>

              {/* Fixture info */}
              {fixture ? (
                <div className="mt-1.5">
                  <div className="text-xs text-muted-foreground">
                    {fixture.isHome ? 'vs' : '@'} {fixture.opponent}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70">
                    {formatKickoff(fixture.kickoff)}
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 text-xs text-muted-foreground/50">No fixture</div>
              )}

              {/* Used label */}
              {isUsed && (
                <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Used
                </div>
              )}

              {/* Current pick label */}
              {isCurrentPick && !isSelected && (
                <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Current pick
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      {selectedTeam && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div>
            <div className="text-sm font-semibold">
              Selected: <span className="text-amber-600 dark:text-amber-400">{selectedTeam}</span>
            </div>
            {selectedTeam !== currentPick && currentPick && (
              <div className="text-xs text-muted-foreground">
                This will replace your current pick ({currentPick})
              </div>
            )}
          </div>
          <Button
            onClick={onConfirm}
            disabled={submitting || disabled || selectedTeam === currentPick}
            className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            {submitting ? 'Submitting...' : 'Confirm Pick'}
          </Button>
        </div>
      )}

      {disabled && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          The deadline has passed. Picks are locked for this gameweek.
        </div>
      )}
    </div>
  );
}
