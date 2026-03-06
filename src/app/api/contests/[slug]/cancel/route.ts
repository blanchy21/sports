/**
 * POST /api/contests/[slug]/cancel — Cancel contest + refund all (admin-only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { requireAdmin } from '@/lib/admin/config';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';

export const POST = createApiHandler('/api/contests/[slug]/cancel', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user || !requireAdmin(user)) {
      throw new ForbiddenError('Admin access required');
    }

    const url = new URL(request.url);
    const slug = url.pathname.split('/api/contests/')[1]?.split('/')[0];

    const contest = await prisma.contest.findUnique({ where: { slug } });
    if (!contest) throw new NotFoundError('Contest not found');

    if (['SETTLED', 'CANCELLED'].includes(contest.status)) {
      throw new ValidationError(`Contest is already ${contest.status}`);
    }

    // Get all entries that need refunds
    const entries = await prisma.contestEntry.findMany({
      where: { contestId: contest.id, refundTxId: null },
    });

    // Mark contest as cancelled
    await prisma.contest.update({
      where: { id: contest.id },
      data: { status: 'CANCELLED' },
    });

    ctx.log.info('Contest cancelled', {
      contestId: contest.id,
      slug,
      entriesToRefund: entries.length,
    });

    // Note: Actual MEDALS refund broadcasting would happen here via escrow ops.
    // For MVP, mark as cancelled and handle refunds manually via admin tools.
    // The buildRefundOps() function in escrow.ts is ready for automated refunds.

    return NextResponse.json({
      success: true,
      data: {
        contestId: contest.id,
        status: 'CANCELLED',
        entriesToRefund: entries.length,
        entryFee: Number(contest.entryFee),
      },
    });
  });
});
