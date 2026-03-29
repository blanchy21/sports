import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { isAdminAccount } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const addMatchSchema = z.object({
  matchNumber: z.number().int().min(1, 'matchNumber must be a positive integer'),
  homeTeam: z.string().min(1, 'homeTeam is required'),
  awayTeam: z.string().min(1, 'awayTeam is required'),
  venue: z.string().optional(),
  kickoffTime: z.string().min(1, 'kickoffTime is required'),
  cricketDataMatchId: z.string().optional(),
});

/**
 * POST /api/ipl-bb/admin/competition/[id]/match
 * Add a match to a competition. Admin only.
 */
export const POST = createApiHandler(
  '/api/ipl-bb/admin/competition/[id]/match',
  async (request, ctx) => {
    return withCsrfProtection(request as NextRequest, async () => {
      const user = await getAuthenticatedUserFromSession(request as NextRequest);
      if (!user) throw new AuthError();
      if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

      const id = extractPathParam(request.url, 'competition');
      if (!id) throw new NotFoundError('Competition not found');

      const competition = await prisma.iplBbCompetition.findUnique({ where: { id } });
      if (!competition) throw new NotFoundError('Competition not found');

      const { matchNumber, homeTeam, awayTeam, venue, kickoffTime, cricketDataMatchId } =
        addMatchSchema.parse(await request.json());

      const kickoff = new Date(kickoffTime);
      if (isNaN(kickoff.getTime())) throw new ValidationError('kickoffTime is not a valid date');

      const match = await prisma.iplBbMatch.create({
        data: {
          competitionId: id,
          matchNumber,
          homeTeam: homeTeam.trim(),
          awayTeam: awayTeam.trim(),
          venue: venue?.trim() || null,
          kickoffTime: kickoff,
          cricketDataMatchId: cricketDataMatchId?.trim() || null,
        },
      });

      const matchCount = await prisma.iplBbMatch.count({ where: { competitionId: id } });
      await prisma.iplBbCompetition.update({ where: { id }, data: { totalMatches: matchCount } });

      ctx.log.info('Match added', { competitionId: id, matchId: match.id, matchNumber });

      return apiSuccess({
        id: match.id,
        matchNumber: match.matchNumber,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        kickoffTime: match.kickoffTime.toISOString(),
        status: match.status,
      });
    });
  }
);
