/**
 * Curation Status API
 *
 * GET: Check curation status for a post or a curator's daily usage.
 *
 * Query params:
 *   ?author=X&permlink=Y  — curations for a specific post
 *   ?curator=X             — daily curation count for a curator
 */

import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';
import { MAX_CURATIONS_PER_DAY } from '@/lib/curation/config';
import { isCuratorAsync } from '@/lib/rewards/curator-rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/curation/status';

export const GET = createApiHandler(ROUTE, async (request) => {
  const { searchParams } = new URL(request.url);
  const author = searchParams.get('author');
  const permlink = searchParams.get('permlink');
  const curatorParam = searchParams.get('curator');

  // Post curation status
  if (author && permlink) {
    const curations = await prisma.curation.findMany({
      where: { author, permlink, status: 'completed' },
      select: {
        curatorUsername: true,
        amount: true,
        createdAt: true,
        source: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      author,
      permlink,
      curated: curations.length > 0,
      totalMedals: curations.reduce((sum, c) => sum + Number(c.amount), 0),
      curations: curations.map((c) => ({
        curator: c.curatorUsername,
        amount: Number(c.amount),
        source: c.source,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  }

  // Curator daily status
  if (curatorParam) {
    const isCurator = await isCuratorAsync(curatorParam);

    if (!isCurator) {
      return NextResponse.json({
        success: true,
        isCurator: false,
        curator: curatorParam,
      });
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const dailyCount = await prisma.curation.count({
      where: {
        curatorUsername: curatorParam,
        createdAt: { gte: todayStart },
        status: { not: 'failed' },
      },
    });

    return NextResponse.json({
      success: true,
      isCurator: true,
      curator: curatorParam,
      dailyCount,
      remaining: Math.max(0, MAX_CURATIONS_PER_DAY - dailyCount),
      limit: MAX_CURATIONS_PER_DAY,
    });
  }

  return NextResponse.json(
    { success: false, error: 'Provide ?author=X&permlink=Y or ?curator=X' },
    { status: 400 }
  );
});
