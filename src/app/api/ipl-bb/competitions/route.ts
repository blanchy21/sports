import { createApiHandler, apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/ipl-bb/competitions
 * List all IPL BB competitions with card data. Public.
 */
export const GET = createApiHandler('/api/ipl-bb/competitions', async () => {
  const competitions = await prisma.iplBbCompetition.findMany({
    orderBy: { roundNumber: 'asc' },
    include: {
      matches: {
        orderBy: { kickoffTime: 'asc' },
        select: {
          id: true,
          homeTeam: true,
          awayTeam: true,
          kickoffTime: true,
          status: true,
        },
      },
    },
  });

  return apiSuccess(
    competitions.map((c) => {
      const now = new Date();
      const nextOpenMatch = c.matches.find(
        (m) => (m.status === 'open' || m.status === 'upcoming') && m.kickoffTime > now
      );
      const resolvedMatchCount = c.matches.filter((m) => m.status === 'resolved').length;

      return {
        id: c.id,
        title: c.title,
        status: c.status,
        roundNumber: c.roundNumber,
        totalEntries: c.totalEntries,
        totalMatches: c.totalMatches,
        prizeFirst: c.prizeFirst,
        prizeSecond: c.prizeSecond,
        prizeThird: c.prizeThird,
        dateFrom: c.dateFrom.toISOString(),
        dateTo: c.dateTo.toISOString(),
        nextOpenMatch: nextOpenMatch
          ? {
              homeTeam: nextOpenMatch.homeTeam,
              awayTeam: nextOpenMatch.awayTeam,
              kickoffTime: nextOpenMatch.kickoffTime.toISOString(),
            }
          : null,
        resolvedMatchCount,
      };
    })
  );
});
