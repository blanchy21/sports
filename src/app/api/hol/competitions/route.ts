import { createApiHandler, apiSuccess } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import { serializeCompetition } from '@/lib/hol/serialize';

/**
 * GET /api/hol/competitions
 * List all Higher or Lower competitions. Public.
 */
export const GET = createApiHandler('/api/hol/competitions', async () => {
  const competitions = await prisma.holCompetition.findMany({
    orderBy: [{ status: 'asc' }, { startsAt: 'desc' }],
    include: { _count: { select: { entries: true, rounds: true } } },
  });

  return apiSuccess(
    competitions.map((c) => ({
      ...serializeCompetition(c),
      entryCount: c._count.entries,
      roundCount: c._count.rounds,
    }))
  );
});
