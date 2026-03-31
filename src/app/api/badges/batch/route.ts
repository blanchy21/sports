import { prisma } from '@/lib/db/prisma';
import { createApiHandler, apiSuccess, validationError } from '@/lib/api/response';
import { getRankTierForScore } from '@/lib/badges/catalogue';
import { z } from 'zod';
import { hiveUsernameSchema, parseSearchParams } from '@/lib/api/validation';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BATCH_SIZE = 25;

const batchQuerySchema = z.object({
  usernames: z
    .string()
    .min(1, 'usernames parameter is required')
    .transform((val) => val.split(',').map((u) => u.trim().toLowerCase()))
    .pipe(z.array(hiveUsernameSchema).min(1).max(MAX_BATCH_SIZE)),
});

/**
 * Batch endpoint returning lightweight rank data for multiple users.
 * Used by feeds to avoid N+1 calls to /api/badges per card.
 */
const ROUTE = '/api/badges/batch';

export const GET = createApiHandler(ROUTE, async (request, ctx) => {
  const parseResult = parseSearchParams(
    (request as NextRequest).nextUrl.searchParams,
    batchQuerySchema
  );

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const usernames = [...new Set(parseResult.data.usernames)];

  ctx.log.debug('Batch fetching badges', { count: usernames.length });

  // Single DB query for all users' stats
  const allStats = await prisma.userStats.findMany({
    where: { username: { in: usernames } },
    select: { username: true, medalsRank: true, medalsScore: true },
  });

  // Build rank map
  const ranks: Record<
    string,
    { score: number; label: string; rank: string; bgGradient: string; textColor: string } | null
  > = {};

  for (const username of usernames) {
    const stats = allStats.find((s) => s.username === username);
    if (stats?.medalsRank) {
      const score = Number(stats.medalsScore);
      const tier = getRankTierForScore(score);
      ranks[username] = {
        score,
        label: tier.label,
        rank: tier.rank,
        bgGradient: tier.bgGradient,
        textColor: tier.textColor,
      };
    } else {
      ranks[username] = null;
    }
  }

  return apiSuccess(
    { ranks },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
});
