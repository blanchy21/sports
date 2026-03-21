import { NextRequest } from 'next/server';
import { createApiHandler, apiSuccess, AuthError, ForbiddenError } from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { isAdminAccount } from '@/lib/admin/config';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/ipl-bb/admin/competitions
 * List all competitions with matches. Admin only.
 */
export const GET = createApiHandler('/api/ipl-bb/admin/competitions', async (request) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user) throw new AuthError();
  if (!isAdminAccount(user.username)) throw new ForbiddenError('Admin access required');

  const competitions = await prisma.iplBbCompetition.findMany({
    orderBy: { roundNumber: 'asc' },
    include: {
      matches: { orderBy: { matchNumber: 'asc' } },
    },
  });

  return apiSuccess(
    competitions.map((c) => ({
      id: c.id,
      title: c.title,
      season: c.season,
      roundNumber: c.roundNumber,
      status: c.status,
      dateFrom: c.dateFrom.toISOString(),
      dateTo: c.dateTo.toISOString(),
      totalMatches: c.totalMatches,
      totalEntries: c.totalEntries,
      matches: c.matches.map((m) => ({
        id: m.id,
        matchNumber: m.matchNumber,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        venue: m.venue,
        kickoffTime: m.kickoffTime.toISOString(),
        status: m.status,
        actualBoundaries: m.actualBoundaries,
        fours: m.fours,
        sixes: m.sixes,
        cricketDataMatchId: m.cricketDataMatchId,
        resolvedAt: m.resolvedAt?.toISOString() ?? null,
        resolvedBy: m.resolvedBy,
      })),
    }))
  );
});
