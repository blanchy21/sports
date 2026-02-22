import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import {
  createRequestContext,
  validationError,
  notFoundError,
  forbiddenError,
  unauthorizedError,
} from '@/lib/api/response';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/communities/[id]';

// Validation schemas
const updateCommunitySchema = z.object({
  name: z.string().min(3).max(100).optional(),
  about: z.string().min(10).max(500).optional(),
  description: z.string().max(5000).optional(),
  sportCategory: z.string().optional(),
  type: z.enum(['public', 'private', 'invite-only']).optional(),
  avatar: z.string().url('Invalid avatar URL').nullable().optional(),
  coverImage: z.string().url('Invalid cover image URL').nullable().optional(),
  // Auth info from client
  userId: z.string().min(1, 'User ID is required'),
});

const deleteRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * GET /api/communities/[id] - Get community by ID or slug
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = createRequestContext(ROUTE);
  const { id } = await params;

  try {
    ctx.log.debug('Fetching community', { id });

    // Try to fetch by ID first, then by slug
    let community = await prisma.community.findUnique({ where: { id } });

    if (!community) {
      community = await prisma.community.findUnique({ where: { slug: id } });
    }

    if (!community) {
      return notFoundError(`Community not found: ${id}`, ctx.requestId);
    }

    // Fetch team members (non-fatal -- community should still render if this fails)
    let team: { username: string; role: string; joinedAt: string }[] = [];
    try {
      const members = await prisma.communityMember.findMany({
        where: {
          communityId: community.id,
          status: 'active',
          role: { in: ['admin', 'moderator'] },
        },
        take: 10,
      });

      team = members.map((m: { username: string; role: string; joinedAt: Date }) => ({
        username: m.username,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      }));
    } catch (memberError) {
      ctx.log.warn('Failed to fetch community members', { id, error: memberError });
    }

    return NextResponse.json({
      success: true,
      community: {
        ...community,
        team,
      },
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * PATCH /api/communities/[id] - Update a community
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  const ctx = createRequestContext(ROUTE);
  const { id } = await params;

  try {
    // Verify session auth
    const sessionUser = await getAuthenticatedUserFromSession(request);
    if (!sessionUser) {
      return unauthorizedError('Authentication required', ctx.requestId);
    }

    const body = await request.json();
    const parseResult = updateCommunitySchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { userId, ...updates } = parseResult.data;

    // Verify the authenticated user matches the request
    if (sessionUser.userId !== userId) {
      return forbiddenError('Cannot update community as another user', ctx.requestId);
    }

    // Fetch existing community
    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return notFoundError(`Community not found: ${id}`, ctx.requestId);
    }

    // Check if user is admin
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: id, userId } },
    });
    if (!membership || membership.role !== 'admin' || membership.status !== 'active') {
      return forbiddenError('Only admins can update this community', ctx.requestId);
    }

    ctx.log.info('Updating community', { id, updates, userId });

    const updatedCommunity = await prisma.community.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      success: true,
      community: updatedCommunity,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * DELETE /api/communities/[id] - Delete a community
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  const ctx = createRequestContext(ROUTE);
  const { id } = await params;

  try {
    // Verify session auth
    const sessionUser = await getAuthenticatedUserFromSession(request);
    if (!sessionUser) {
      return unauthorizedError('Authentication required', ctx.requestId);
    }

    const body = await request.json();
    const parseResult = deleteRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { userId } = parseResult.data;

    // Verify the authenticated user matches the request
    if (sessionUser.userId !== userId) {
      return forbiddenError('Cannot delete community as another user', ctx.requestId);
    }

    // Fetch existing community
    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) {
      return notFoundError(`Community not found: ${id}`, ctx.requestId);
    }

    // Only the creator can delete
    if (community.createdBy !== userId) {
      return forbiddenError('Only the community creator can delete this community', ctx.requestId);
    }

    ctx.log.info('Deleting community', { id, userId });

    // Delete members and community in a transaction
    await prisma.$transaction([
      prisma.communityMember.deleteMany({ where: { communityId: id } }),
      prisma.communityInvite.deleteMany({ where: { communityId: id } }),
      prisma.community.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Community deleted successfully',
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
