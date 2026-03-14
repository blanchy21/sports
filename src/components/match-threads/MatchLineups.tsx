'use client';

import React from 'react';
import { cn } from '@/lib/utils/client';
import type { MatchLineup, MatchLineupPlayer } from '@/types/sports';

interface MatchLineupsProps {
  homeLineup: MatchLineup | null;
  awayLineup: MatchLineup | null;
}

function PlayerRow({ player }: { player: MatchLineupPlayer }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {/* Jersey number */}
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {player.jersey}
      </span>
      {/* Player name */}
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{player.name}</span>
      {/* Sub indicators */}
      {player.subbedIn && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" title="Subbed in" />
      )}
      {player.subbedOut && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="Subbed out" />
      )}
    </div>
  );
}

function LineupColumn({ lineup }: { lineup: MatchLineup }) {
  const starters = lineup.players.filter((p) => p.isStarter);
  const substitutes = lineup.players.filter((p) => !p.isStarter);

  return (
    <div className="min-w-0 flex-1">
      {/* Team name + formation */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-foreground">{lineup.teamName}</h4>
        {lineup.formation && <p className="text-xs text-muted-foreground">{lineup.formation}</p>}
      </div>

      {/* Starters */}
      <div className="space-y-0.5">
        {starters.map((player) => (
          <PlayerRow key={`${player.jersey}-${player.name}`} player={player} />
        ))}
      </div>

      {/* Substitutes */}
      {substitutes.length > 0 && (
        <>
          <div className="my-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">Substitutes</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-0.5">
            {substitutes.map((player) => (
              <PlayerRow key={`${player.jersey}-${player.name}`} player={player} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function MatchLineups({ homeLineup, awayLineup }: MatchLineupsProps) {
  if (!homeLineup && !awayLineup) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No lineup data available
      </div>
    );
  }

  return (
    <div className={cn('grid gap-6', homeLineup && awayLineup ? 'grid-cols-2' : 'grid-cols-1')}>
      {homeLineup && <LineupColumn lineup={homeLineup} />}
      {awayLineup && <LineupColumn lineup={awayLineup} />}
    </div>
  );
}
