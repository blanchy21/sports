import { createApiHandler, apiSuccess, NotFoundError } from '@/lib/api/response';
import { extractPathParam } from '@/lib/api/route-params';
import { prisma } from '@/lib/db/prisma';
import { rankEntries } from '@/lib/ipl-bb/utils';

/**
 * GET /api/ipl-bb/competition/[id]/leaderboard
 * Live standings. Public.
 */
export const GET = createApiHandler('/api/ipl-bb/competition/[id]/leaderboard', async (request) => {
  const id = extractPathParam(request.url, 'competition');
  if (!id) throw new NotFoundError('Competition not found');

  const competition = await prisma.iplBbCompetition.findUnique({ where: { id } });
  if (!competition) throw new NotFoundError('Competition not found');

  const entries = await prisma.iplBbEntry.findMany({
    where: { competitionId: id },
    select: {
      username: true,
      totalPoints: true,
      bustCount: true,
      hitCount: true,
      submittedCount: true,
      prizeAwarded: true,
      createdAt: true,
      picks: {
        orderBy: { firstSubmittedAt: 'asc' },
        take: 1,
        select: { firstSubmittedAt: true },
      },
    },
  });

  const entriesWithTimestamp = entries.map((e) => ({
    rank: 0,
    username: e.username,
    totalPoints: e.totalPoints,
    bustCount: e.bustCount,
    hitCount: e.hitCount,
    submittedCount: e.submittedCount,
    prizeAwarded: e.prizeAwarded,
    firstSubmittedAt: (e.picks[0]?.firstSubmittedAt ?? e.createdAt).toISOString(),
  }));

  return apiSuccess(rankEntries(entriesWithTimestamp));
});
