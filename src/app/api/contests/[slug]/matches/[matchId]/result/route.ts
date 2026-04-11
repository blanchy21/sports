/**
 * PATCH /api/contests/[slug]/matches/[matchId]/result — Enter/update match result (admin)
 * Triggers leaderboard recalculation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { requireAdmin } from '@/lib/admin/config';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { serializeMatch } from '@/lib/contests/serialize';
import { recalculateLeaderboard } from '@/lib/contests/recalculate';

export const PATCH = createApiHandler(
  '/api/contests/[slug]/matches/[matchId]/result',
  async (request, ctx) => {
    return withCsrfProtection(request as NextRequest, async () => {
      const user = await getAuthenticatedUserFromSession(request as NextRequest);
      if (!user || !requireAdmin(user)) {
        throw new ForbiddenError('Admin access required');
      }

      const matchId = extractPathParam(request.url, 'matches');
      if (!matchId) throw new NotFoundError('Match not found');

      const match = await prisma.contestMatch.findUnique({
        where: { id: matchId },
        include: { contest: true },
      });

      if (!match) throw new NotFoundError('Match not found');

      // Contest must be ACTIVE or REGISTRATION (for pre-entering results in testing)
      if (!['ACTIVE', 'REGISTRATION'].includes(match.contest.status)) {
        throw new ValidationError(`Cannot enter results when contest is ${match.contest.status}`);
      }

      const body = await request.json();
      const { homeScore, awayScore } = body;

      if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
        throw new ValidationError('homeScore and awayScore must be numbers');
      }
      if (
        homeScore < 0 ||
        awayScore < 0 ||
        !Number.isInteger(homeScore) ||
        !Number.isInteger(awayScore)
      ) {
        throw new ValidationError('Scores must be non-negative integers');
      }

      // Update match result
      const updated = await prisma.contestMatch.update({
        where: { id: matchId },
        data: {
          homeScore,
          awayScore,
          resultEnteredAt: new Date(),
          resultEnteredBy: user.username,
        },
      });

      // Recalculate leaderboard
      const recalcResult = await recalculateLeaderboard(match.contestId);

      ctx.log.info('Match result entered', {
        matchId,
        contestId: match.contestId,
        homeScore,
        awayScore,
        entriesRecalculated: recalcResult.entriesUpdated,
      });

      return NextResponse.json({
        success: true,
        data: {
          match: serializeMatch(updated),
          leaderboard: { entriesUpdated: recalcResult.entriesUpdated },
        },
      });
    });
  }
);
