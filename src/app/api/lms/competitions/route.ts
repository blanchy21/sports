import { createApiHandler, apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/lms/competitions
 * List active LMS competitions. Public.
 */
export const GET = createApiHandler('/api/lms/competitions', async () => {
  const competitions = await prisma.lmsCompetition.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      gameweeks: {
        where: { status: { not: 'upcoming' } },
        orderBy: { gameweek: 'desc' },
        take: 1,
      },
      _count: { select: { entries: { where: { status: 'alive' } } } },
    },
  });

  return apiSuccess(
    competitions.map((c) => ({
      id: c.id,
      name: c.name,
      season: c.season,
      status: c.status,
      currentGameweek: c.currentGameweek,
      startGameweek: c.startGameweek,
      isFreeEntry: c.isFreeEntry,
      entryFeeMedals: c.entryFeeMedals,
      prizeHive: c.prizeHive,
      prizeMedals: c.prizeMedals,
      totalEntries: c.totalEntries,
      registrationDeadline: c.registrationDeadline?.toISOString() ?? null,
      winnerUsername: c.winnerUsername,
      completedAt: c.completedAt?.toISOString() ?? null,
      aliveCount: c._count.entries,
      currentGameweekData: c.gameweeks[0]
        ? {
            gameweek: c.gameweeks[0].gameweek,
            deadline: c.gameweeks[0].deadline.toISOString(),
            status: c.gameweeks[0].status,
            survivorsCount: c.gameweeks[0].survivorsCount,
            eliminatedCount: c.gameweeks[0].eliminatedCount,
            fixtures: c.gameweeks[0].fixtures,
          }
        : undefined,
    }))
  );
});
