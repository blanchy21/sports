import { NextRequest } from 'next/server';
import {
  createApiHandler,
  apiSuccess,
  NotFoundError,
  AuthError,
  ForbiddenError,
  ValidationError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { isAdminAccount } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/ipl-bb/admin/competition/[id]/match
 * Add a match to a competition. Admin only.
 */
export const POST = createApiHandler(
  '/api/ipl-bb/admin/competition/[id]/match',
  async (request, ctx) => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) throw new AuthError();
    if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

    const id = new URL(request.url).pathname
      .split('/api/ipl-bb/admin/competition/')[1]
      ?.split('/')[0];
    if (!id) throw new NotFoundError('Competition not found');

    const competition = await prisma.iplBbCompetition.findUnique({ where: { id } });
    if (!competition) throw new NotFoundError('Competition not found');

    const body = await request.json();
    const { matchNumber, homeTeam, awayTeam, venue, kickoffTime, cricketDataMatchId } = body;

    if (!matchNumber || typeof matchNumber !== 'number' || matchNumber < 1) {
      throw new ValidationError('matchNumber must be a positive integer');
    }
    if (!homeTeam || typeof homeTeam !== 'string')
      throw new ValidationError('homeTeam is required');
    if (!awayTeam || typeof awayTeam !== 'string')
      throw new ValidationError('awayTeam is required');
    if (!kickoffTime) throw new ValidationError('kickoffTime is required');

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
  }
);
