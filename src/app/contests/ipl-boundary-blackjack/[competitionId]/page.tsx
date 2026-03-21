'use client';

import React, { useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { IplBbHero } from '@/components/ipl-bb/IplBbHero';
import { IplBbGuessInput } from '@/components/ipl-bb/IplBbGuessInput';
import { IplBbLeaderboard } from '@/components/ipl-bb/IplBbLeaderboard';
import { IplBbMyPicks } from '@/components/ipl-bb/IplBbMyPicks';
import { IplBbMatchList } from '@/components/ipl-bb/IplBbMatchList';
import {
  useIplBbCompetition,
  useIplBbLeaderboard,
  useIplBbMyPicks,
  useIplBbJoin,
  useIplBbPick,
} from '@/lib/react-query/queries/useIplBb';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/core/Toast';

export default function IplBbCompetitionPage() {
  const params = useParams();
  const competitionId = params.competitionId as string;
  const { user } = useAuth();

  const { data: competition, isLoading: compLoading } = useIplBbCompetition(competitionId);
  const { data: leaderboard, isLoading: lbLoading } = useIplBbLeaderboard(competitionId);
  const { data: myPicks, isLoading: picksLoading } = useIplBbMyPicks(competitionId, {
    enabled: !!user,
  });

  const joinMutation = useIplBbJoin(competitionId);
  const pickMutation = useIplBbPick(competitionId);

  // Derive user state from leaderboard
  const userEntry = useMemo(() => {
    if (!leaderboard || !user) return null;
    return leaderboard.find((e) => e.username === user.username) ?? null;
  }, [leaderboard, user]);

  // Check if user has entered (has picks data or is in leaderboard)
  const hasEntered = !!userEntry || (myPicks != null && myPicks.length > 0);

  // Open matches (status 'open' and kickoff in the future)
  const openMatches = useMemo(() => {
    if (!competition) return [];
    return competition.matches.filter(
      (m) => m.status === 'open' && new Date(m.kickoffTime).getTime() > Date.now()
    );
  }, [competition]);

  const handleJoin = useCallback(async () => {
    try {
      await joinMutation.mutateAsync();
      toast.success('Joined the competition!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join');
    }
  }, [joinMutation]);

  const handlePick = useCallback(
    async (matchId: string, guess: number) => {
      try {
        await pickMutation.mutateAsync({ matchId, guess });
        toast.success('Guess submitted!');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to submit guess');
      }
    },
    [pickMutation]
  );

  if (compLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="animate-pulse space-y-4">
            <div className="h-48 rounded-2xl bg-sb-turf" />
            <div className="h-32 rounded-xl bg-sb-turf" />
            <div className="h-64 rounded-xl bg-sb-turf" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!competition) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-muted-foreground">Competition not found.</p>
          <Link
            href="/contests"
            className="mt-4 inline-block text-sm text-amber-600 hover:underline"
          >
            Back to contests
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* Back link */}
        <Link
          href="/contests"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All Contests
        </Link>

        {/* Hero */}
        <IplBbHero
          competition={competition}
          userRank={userEntry?.rank}
          userPoints={userEntry?.totalPoints}
          hasEntered={hasEntered}
        />

        {/* Join button (if not entered) */}
        {user &&
          !hasEntered &&
          (competition.status === 'open' || competition.status === 'active') && (
            <div className="mt-4">
              <button
                onClick={handleJoin}
                disabled={joinMutation.isPending}
                className="w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {joinMutation.isPending ? 'Joining...' : 'Join Competition — Free Entry'}
              </button>
            </div>
          )}

        {/* Not logged in prompt */}
        {!user && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center text-sm">
            <p className="text-muted-foreground">Sign in to join and submit your guesses.</p>
          </div>
        )}

        {/* Open matches for picking */}
        {hasEntered && openMatches.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-bold">Open Matches</h2>
            <div className="space-y-3">
              {openMatches.map((match) => {
                const existingPick = myPicks?.find((p) => p.matchId === match.id);
                return (
                  <IplBbGuessInput
                    key={match.id}
                    match={match}
                    existingGuess={existingPick?.guess}
                    existingPointsScored={existingPick?.pointsScored}
                    existingIsBust={existingPick?.isBust}
                    onSubmit={handlePick}
                    isSubmitting={pickMutation.isPending}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-bold">Standings</h2>
          <IplBbLeaderboard
            entries={leaderboard ?? []}
            currentUser={user?.username}
            prizeFirst={competition.prizeFirst}
            prizeSecond={competition.prizeSecond}
            prizeThird={competition.prizeThird}
            isLoading={lbLoading}
          />
        </div>

        {/* My Picks */}
        {hasEntered && (
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-bold">My Picks</h2>
            <IplBbMyPicks picks={myPicks ?? []} isLoading={picksLoading} />
          </div>
        )}

        {/* All Matches */}
        <div className="mb-8 mt-6">
          <h2 className="mb-3 text-lg font-bold">All Matches</h2>
          <IplBbMatchList matches={competition.matches} />
        </div>
      </div>
    </MainLayout>
  );
}
