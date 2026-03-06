/**
 * GET /api/contests — List contests
 * POST /api/contests — Create contest (admin-only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { ForbiddenError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { serializeContest } from '@/lib/contests/serialize';
import { CONTEST_CONFIG, CONTEST_TYPES } from '@/lib/contests/constants';
import type { ContestStatus } from '@/generated/prisma/client';

export const GET = createApiHandler('/api/contests', async (request, _ctx) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as ContestStatus | null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const cursor = searchParams.get('cursor');

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  } else {
    // By default, don't show DRAFT contests to public
    where.status = { not: 'DRAFT' };
  }

  const contests = await prisma.contest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = contests.length > limit;
  const items = hasMore ? contests.slice(0, limit) : contests;

  // Batch-query interest counts
  const interestCounts = items.length > 0
    ? await prisma.contestInterest.groupBy({
        by: ['contestId'],
        where: { contestId: { in: items.map((c) => c.id) } },
        _count: { id: true },
      })
    : [];
  const countMap = new Map(interestCounts.map((r) => [r.contestId, r._count.id]));

  return NextResponse.json({
    success: true,
    data: items.map((c) =>
      serializeContest(c, { interestCount: countMap.get(c.id) ?? 0 })
    ),
    pagination: {
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    },
  });
});

export const POST = createApiHandler('/api/contests', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user || !requireAdmin(user)) {
      throw new ForbiddenError('Admin access required');
    }

    const body = await request.json();
    const {
      slug,
      title,
      description,
      contestType,
      rules,
      entryFee,
      maxEntries,
      registrationOpens,
      registrationCloses,
      startsAt,
      endsAt,
      typeConfig,
      coverImage,
    } = body;

    // Validate required fields
    if (!slug || !title || !contestType || !entryFee || !registrationOpens || !registrationCloses || !startsAt) {
      throw new ValidationError('Missing required fields: slug, title, contestType, entryFee, registrationOpens, registrationCloses, startsAt');
    }

    // Validate contest type
    const validTypes = Object.values(CONTEST_TYPES);
    if (!validTypes.includes(contestType)) {
      throw new ValidationError(`Invalid contestType. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate entry fee
    const fee = Number(entryFee);
    if (isNaN(fee) || fee < CONTEST_CONFIG.MIN_ENTRY_FEE || fee > CONTEST_CONFIG.MAX_ENTRY_FEE) {
      throw new ValidationError(`Entry fee must be between ${CONTEST_CONFIG.MIN_ENTRY_FEE} and ${CONTEST_CONFIG.MAX_ENTRY_FEE} MEDALS`);
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new ValidationError('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    const contest = await prisma.contest.create({
      data: {
        slug,
        title,
        description: description || '',
        contestType,
        rules: rules || '',
        entryFee: fee,
        maxEntries: maxEntries ? Number(maxEntries) : null,
        registrationOpens: new Date(registrationOpens),
        registrationCloses: new Date(registrationCloses),
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        creatorUsername: user.username,
        typeConfig: typeConfig || null,
        coverImage: coverImage || null,
        platformFeePct: CONTEST_CONFIG.DEFAULT_PLATFORM_FEE_PCT,
        creatorFeePct: CONTEST_CONFIG.DEFAULT_CREATOR_FEE_PCT,
      },
    });

    ctx.log.info('Contest created', { contestId: contest.id, slug, contestType });

    return NextResponse.json({
      success: true,
      data: serializeContest(contest),
    }, { status: 201 });
  });
});
