/**
 * Admin Curators API Route
 *
 * Manage designated curator accounts via the CuratorRoster database table.
 * Requires admin account access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler, forbiddenError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/admin/config';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { csrfProtected } from '@/lib/api/csrf';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/admin/curators';

const mutationSchema = z.object({
  curator: z
    .string()
    .min(1, 'Curator username is required')
    .regex(/^[a-z][a-z0-9.-]{2,15}$/, 'Invalid Hive username'),
});

/**
 * GET /api/admin/curators - List curators
 */
export const GET = createApiHandler(ROUTE, async (request, ctx) => {
  const user = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!user || !requireAdmin(user)) {
    return forbiddenError('Admin access required', ctx.requestId);
  }

  const curators = await prisma.curatorRoster.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    success: true,
    curators: curators.map((c) => ({
      username: c.username,
      addedBy: c.addedBy,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    })),
  });
});

/**
 * POST /api/admin/curators - Add a curator
 */
export const POST = csrfProtected(
  createApiHandler(ROUTE, async (request, ctx) => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user || !requireAdmin(user)) {
      return forbiddenError('Admin access required', ctx.requestId);
    }

    const body = await request.json();
    const parsed = mutationSchema.parse(body);

    // Check if already exists (might be deactivated)
    const existing = await prisma.curatorRoster.findUnique({
      where: { username: parsed.curator },
    });

    if (existing?.isActive) {
      return NextResponse.json(
        { success: false, error: `${parsed.curator} is already an active curator` },
        { status: 409 }
      );
    }

    // Reactivate or create
    const curator = await prisma.curatorRoster.upsert({
      where: { username: parsed.curator },
      update: { isActive: true, addedBy: user.username },
      create: { username: parsed.curator, addedBy: user.username },
    });

    logger.info(`Curator added: ${parsed.curator} by ${user.username}`, 'admin:curators');

    return NextResponse.json({
      success: true,
      curator: {
        username: curator.username,
        addedBy: curator.addedBy,
        isActive: curator.isActive,
        createdAt: curator.createdAt.toISOString(),
      },
    });
  })
);

/**
 * DELETE /api/admin/curators - Deactivate a curator (soft delete)
 */
export const DELETE = csrfProtected(
  createApiHandler(ROUTE, async (request, ctx) => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user || !requireAdmin(user)) {
      return forbiddenError('Admin access required', ctx.requestId);
    }

    const body = await request.json();
    const parsed = mutationSchema.parse(body);

    const existing = await prisma.curatorRoster.findUnique({
      where: { username: parsed.curator },
    });

    if (!existing || !existing.isActive) {
      return NextResponse.json(
        { success: false, error: `${parsed.curator} is not an active curator` },
        { status: 404 }
      );
    }

    await prisma.curatorRoster.update({
      where: { username: parsed.curator },
      data: { isActive: false },
    });

    logger.info(`Curator deactivated: ${parsed.curator} by ${user.username}`, 'admin:curators');

    return NextResponse.json({ success: true, deactivated: parsed.curator });
  })
);
