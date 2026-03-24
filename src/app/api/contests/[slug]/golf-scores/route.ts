/**
 * Golf Scores Admin API
 *
 * GET  — Return draft scores, published state, unmatched names
 * POST — Actions: sync, publish, override, set-winning-score
 *
 * All operations are admin-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { CONTEST_TYPES } from '@/lib/contests/constants';
import {
  fetchEspnGolfScores,
  matchGolfersToTeams,
  getGolfScoringState,
  type GolfScoringState,
  type GolferTeamMetadata,
} from '@/lib/contests/espn-golf';

/** Convert a typed object to Prisma-compatible JSON value */
function toJsonValue(obj: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(obj)) as Prisma.InputJsonValue;
}
import { recalculateLeaderboard } from '@/lib/contests/recalculate';

function extractSlug(url: string): string {
  const match = url.match(/\/api\/contests\/([^/]+)\//);
  return match?.[1] || '';
}

// ============================================================================
// GET — Return current scoring state
// ============================================================================

export const GET = createApiHandler('/api/contests/[slug]/golf-scores', async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user || !requireAdmin(user)) throw new ForbiddenError('Admin access required');

  const slug = extractSlug(request.url);
  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) throw new NotFoundError('Contest not found');
  if (contest.contestType !== CONTEST_TYPES.GOLF_FANTASY) {
    throw new ValidationError('Not a golf contest');
  }

  const scoringState = getGolfScoringState(contest.typeConfig);

  // Also return team metadata (published scores)
  const teams = await prisma.contestTeam.findMany({
    where: { contestId: contest.id },
    select: { code: true, name: true, metadata: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    success: true,
    data: {
      scoring: scoringState,
      teams: teams.map((t) => ({
        code: t.code,
        name: t.name,
        metadata: t.metadata,
      })),
    },
  });
});

// ============================================================================
// POST — Admin actions
// ============================================================================

export const POST = createApiHandler('/api/contests/[slug]/golf-scores', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user || !requireAdmin(user)) throw new ForbiddenError('Admin access required');

    const slug = extractSlug(request.url);
    const contest = await prisma.contest.findUnique({ where: { slug } });
    if (!contest) throw new NotFoundError('Contest not found');
    if (contest.contestType !== CONTEST_TYPES.GOLF_FANTASY) {
      throw new ValidationError('Not a golf contest');
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    const typeConfig = (contest.typeConfig as Record<string, unknown>) || {};
    const scoringState = getGolfScoringState(contest.typeConfig);

    switch (action) {
      // ----------------------------------------------------------------
      // SYNC — Fetch ESPN scores and store as draft
      // ----------------------------------------------------------------
      case 'sync': {
        const espnResult = await fetchEspnGolfScores();

        // Load DB teams for matching
        const dbTeams = await prisma.contestTeam.findMany({
          where: { contestId: contest.id },
          select: { code: true, name: true },
        });

        const { matched, unmatched } = matchGolfersToTeams(
          espnResult.golfers,
          dbTeams,
          scoringState.nameOverrides
        );

        // Build draft scores array (only matched golfers)
        const draftScores = matched.map((m) => m.espnData);

        const updatedScoring: GolfScoringState = {
          ...scoringState,
          draftScores,
          draftFetchedAt: new Date().toISOString(),
          unmatchedNames: unmatched,
        };

        await prisma.contest.update({
          where: { id: contest.id },
          data: {
            typeConfig: toJsonValue({ ...typeConfig, golfScoring: updatedScoring }),
          },
        });

        ctx.log.info('Golf scores synced from ESPN', {
          contestId: contest.id,
          matched: matched.length,
          unmatched: unmatched.length,
          tournament: espnResult.tournamentName,
          round: espnResult.currentRound,
        });

        return NextResponse.json({
          success: true,
          data: {
            matched: matched.length,
            unmatched,
            tournamentName: espnResult.tournamentName,
            currentRound: espnResult.currentRound,
            draftFetchedAt: updatedScoring.draftFetchedAt,
          },
        });
      }

      // ----------------------------------------------------------------
      // PUBLISH — Copy draft scores to ContestTeam metadata + recalculate
      // ----------------------------------------------------------------
      case 'publish': {
        if (!scoringState.draftScores || scoringState.draftScores.length === 0) {
          throw new ValidationError('No draft scores to publish. Sync from ESPN first.');
        }

        // Load DB teams for code lookup
        const dbTeams = await prisma.contestTeam.findMany({
          where: { contestId: contest.id },
          select: { code: true, name: true },
        });

        // Re-match to get code mapping
        const { matched } = matchGolfersToTeams(
          scoringState.draftScores,
          dbTeams,
          scoringState.nameOverrides
        );

        // Determine current max round from draft data
        let maxRound = 0;
        for (const m of matched) {
          const rounds = Object.keys(m.espnData.rounds).map(Number);
          const highest = Math.max(...rounds, 0);
          if (highest > maxRound) maxRound = highest;
        }

        // Update each ContestTeam's metadata with scores
        for (const m of matched) {
          const team = await prisma.contestTeam.findFirst({
            where: { contestId: contest.id, code: m.teamCode },
          });
          if (!team) continue;

          const existingMeta = (team.metadata as unknown as GolferTeamMetadata) || { odds: 0 };

          const roundsDisplay: Record<string, string> = {};
          const strokesMap: Record<string, number> = {};
          for (const [rNum, rData] of Object.entries(m.espnData.rounds)) {
            roundsDisplay[rNum] = rData.display;
            strokesMap[rNum] = rData.strokes;
          }

          const updatedMeta: GolferTeamMetadata = {
            ...existingMeta,
            rounds: roundsDisplay,
            strokes: strokesMap,
            scoreRelToPar: m.espnData.scoreRelToPar,
            position: m.espnData.order,
            status: m.espnData.status,
          };

          await prisma.contestTeam.update({
            where: { id: team.id },
            data: { metadata: toJsonValue(updatedMeta) },
          });
        }

        // Update scoring state
        const updatedScoring: GolfScoringState = {
          ...scoringState,
          publishedRound: maxRound,
          draftScores: null, // Clear draft after publish
          draftFetchedAt: null,
        };

        await prisma.contest.update({
          where: { id: contest.id },
          data: {
            typeConfig: toJsonValue({ ...typeConfig, golfScoring: updatedScoring }),
          },
        });

        // Recalculate leaderboard
        const recalcResult = await recalculateLeaderboard(contest.id);

        ctx.log.info('Golf scores published', {
          contestId: contest.id,
          publishedRound: maxRound,
          teamsUpdated: matched.length,
          entriesRecalculated: recalcResult.entriesUpdated,
        });

        return NextResponse.json({
          success: true,
          data: {
            publishedRound: maxRound,
            teamsUpdated: matched.length,
            entriesRecalculated: recalcResult.entriesUpdated,
          },
        });
      }

      // ----------------------------------------------------------------
      // OVERRIDE — Add a name override mapping
      // ----------------------------------------------------------------
      case 'override': {
        const { espnName, teamCode } = body;
        if (!espnName || !teamCode) {
          throw new ValidationError('espnName and teamCode are required');
        }

        // Verify team code exists
        const team = await prisma.contestTeam.findFirst({
          where: { contestId: contest.id, code: teamCode },
        });
        if (!team) throw new ValidationError(`Team code not found: ${teamCode}`);

        const updatedScoring: GolfScoringState = {
          ...scoringState,
          nameOverrides: {
            ...scoringState.nameOverrides,
            [espnName]: teamCode,
          },
          unmatchedNames: scoringState.unmatchedNames.filter((n) => n !== espnName),
        };

        await prisma.contest.update({
          where: { id: contest.id },
          data: {
            typeConfig: toJsonValue({ ...typeConfig, golfScoring: updatedScoring }),
          },
        });

        ctx.log.info('Golf name override added', {
          contestId: contest.id,
          espnName,
          teamCode,
        });

        return NextResponse.json({
          success: true,
          data: { espnName, teamCode },
        });
      }

      // ----------------------------------------------------------------
      // SET-WINNING-SCORE — Set the actual winning score for tiebreaker
      // ----------------------------------------------------------------
      case 'set-winning-score': {
        const { score } = body;
        if (typeof score !== 'number') {
          throw new ValidationError('score must be a number (relative to par)');
        }

        const updatedScoring: GolfScoringState = {
          ...scoringState,
          winningScore: score,
        };

        await prisma.contest.update({
          where: { id: contest.id },
          data: {
            typeConfig: toJsonValue({ ...typeConfig, golfScoring: updatedScoring }),
          },
        });

        // Recalculate to apply tiebreaker
        const recalcResult = await recalculateLeaderboard(contest.id);

        ctx.log.info('Golf winning score set', {
          contestId: contest.id,
          winningScore: score,
          entriesRecalculated: recalcResult.entriesUpdated,
        });

        return NextResponse.json({
          success: true,
          data: { winningScore: score, entriesRecalculated: recalcResult.entriesUpdated },
        });
      }

      default:
        throw new ValidationError(
          `Unknown action: ${action}. Use: sync, publish, override, set-winning-score`
        );
    }
  });
});
