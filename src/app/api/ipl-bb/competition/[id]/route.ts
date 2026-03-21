import { createApiHandler, apiSuccess, NotFoundError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/ipl-bb/competition/[id]
 * Competition detail with all matches. Public.
 */
export const GET = createApiHandler('/api/ipl-bb/competition/[id]', async (request) => {
  const id = new URL(request.url).pathname.split('/api/ipl-bb/competition/')[1]?.split('/')[0];
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.iplBbCompetition.findUnique({
    where: { id },
    include: {
      matches: { orderBy: { matchNumber: 'asc' } },
    },
  });

  if (!competition) throw new NotFoundError('Competition not found');

  return apiSuccess({
    id: competition.id,
    title: competition.title,
    season: competition.season,
    roundNumber: competition.roundNumber,
    status: competition.status,
    dateFrom: competition.dateFrom.toISOString(),
    dateTo: competition.dateTo.toISOString(),
    prizeFirst: competition.prizeFirst,
    prizeSecond: competition.prizeSecond,
    prizeThird: competition.prizeThird,
    totalMatches: competition.totalMatches,
    totalEntries: competition.totalEntries,
    matches: competition.matches.map((m) => ({
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
    })),
  });
});
