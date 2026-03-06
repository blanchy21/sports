/**
 * GET /api/contests/[slug] — Contest detail (+ user entry if authed)
 * PATCH /api/contests/[slug] — Update contest (admin-only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { serializeContest } from '@/lib/contests/serialize';
import type { ContestStatus } from '@/generated/prisma/client';

export const GET = createApiHandler('/api/contests/[slug]', async (request, _ctx) => {
  const url = new URL(request.url);
  const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];

  if (!slug) throw new NotFoundError('Contest not found');

  const contest = await prisma.contest.findUnique({ where: { slug } });
  if (!contest) throw new NotFoundError('Contest not found');

  // Interest count
  const interestCount = await prisma.contestInterest.count({
    where: { contestId: contest.id },
  });

  // Check if current user has an entry / interest
  let userEntry = null;
  let isInterested = false;
  try {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (user) {
      const [entry, interest] = await Promise.all([
        prisma.contestEntry.findUnique({
          where: { contestId_username: { contestId: contest.id, username: user.username } },
        }),
        prisma.contestInterest.findUnique({
          where: { contestId_username: { contestId: contest.id, username: user.username } },
        }),
      ]);
      userEntry = entry;
      isInterested = !!interest;
    }
  } catch {
    // No auth — fine, just don't include user entry
  }

  return NextResponse.json({
    success: true,
    data: serializeContest(contest, { userEntry, interestCount, isInterested }),
  });
});

const VALID_STATUS_TRANSITIONS: Record<string, ContestStatus[]> = {
  DRAFT: ['REGISTRATION', 'CANCELLED'],
  REGISTRATION: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['CALCULATING'],
  CALCULATING: ['SETTLED', 'ACTIVE'], // ACTIVE for retry after failure
};

export const PATCH = createApiHandler('/api/contests/[slug]', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user || !requireAdmin(user)) {
      throw new ForbiddenError('Admin access required');
    }

    const url = new URL(request.url);
    const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];
    if (!slug) throw new NotFoundError('Contest not found');

    const contest = await prisma.contest.findUnique({ where: { slug } });
    if (!contest) throw new NotFoundError('Contest not found');

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Status transition
    if (body.status) {
      const validTransitions = VALID_STATUS_TRANSITIONS[contest.status];
      if (!validTransitions?.includes(body.status)) {
        throw new ValidationError(
          `Cannot transition from ${contest.status} to ${body.status}. Valid: ${validTransitions?.join(', ') || 'none'}`
        );
      }
      updateData.status = body.status;
    }

    // Updatable fields
    const updatableFields = ['title', 'description', 'rules', 'coverImage', 'typeConfig', 'maxEntries'] as const;
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Date fields (only if in DRAFT)
    if (contest.status === 'DRAFT') {
      const dateFields = ['registrationOpens', 'registrationCloses', 'startsAt', 'endsAt'] as const;
      for (const field of dateFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        }
      }
    }

    const updated = await prisma.contest.update({
      where: { id: contest.id },
      data: updateData,
    });

    ctx.log.info('Contest updated', { contestId: contest.id, updates: Object.keys(updateData) });

    return NextResponse.json({
      success: true,
      data: serializeContest(updated),
    });
  });
});
