import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import {
  createApiHandler,
  validationError,
  notFoundError,
  forbiddenError,
  unauthorizedError,
} from '@/lib/api/response';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { resolveCommunity } from '../../_resolve';
import { Prisma } from '@/generated/prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/communities/[id]/members';

/** Extract community ID from URL path: /api/communities/{id}/members */
function extractCommunityId(request: Request): string {
  return extractPathParam(request.url, 'communities') ?? '';
}

// Validation schemas
const listMembersSchema = z.object({
  status: z.enum(['active', 'pending', 'banned']).optional(),
  role: z.enum(['admin', 'moderator', 'member']).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
  // Optional: lookup a specific user's membership
  userId: z.string().optional(),
});

const joinRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required'),
  hiveUsername: z.string().optional(),
});

const updateMemberSchema = z.object({
  action: z.enum(['approve', 'reject', 'promote', 'demote', 'ban', 'unban']),
  targetUserId: z.string().min(1, 'Target user ID is required'),
  role: z.enum(['admin', 'moderator', 'member']).optional(),
  // Requesting user
  userId: z.string().min(1, 'User ID is required'),
});

const leaveRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * GET /api/communities/[id]/members - List community members
 */
export const GET = createApiHandler(ROUTE, async (request, ctx) => {
  const communityId = extractCommunityId(request);

  // Parse query parameters
  const searchParams = Object.fromEntries((request as NextRequest).nextUrl.searchParams);
  const parseResult = listMembersSchema.safeParse(searchParams);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { status, role, limit, userId } = parseResult.data;

  // Check if community exists (try by ID first, then by slug)
  let community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) {
    community = await prisma.community.findUnique({ where: { slug: communityId } });
  }
  if (!community) {
    return notFoundError(`Community not found: ${communityId}`, ctx.requestId);
  }

  // Use the resolved community ID for member queries
  const resolvedCommunityId = community.id;

  // If userId is provided, lookup single membership directly
  if (userId) {
    ctx.log.debug('Looking up single membership', { communityId: resolvedCommunityId, userId });

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: resolvedCommunityId, userId } },
    });

    return NextResponse.json(
      {
        success: true,
        membership: membership || null,
        isMember: !!membership && membership.status === 'active',
      },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    );
  }

  // Otherwise, list all members
  ctx.log.debug('Listing community members', {
    communityId: resolvedCommunityId,
    status,
    role,
    limit,
  });

  const where: Prisma.CommunityMemberWhereInput = { communityId: resolvedCommunityId };
  if (status) where.status = status;
  if (role) where.role = role;

  const members = await prisma.communityMember.findMany({
    where,
    take: limit,
  });

  return NextResponse.json(
    {
      success: true,
      members,
      count: members.length,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
  );
});

/**
 * POST /api/communities/[id]/members - Join a community
 */
export const POST = createApiHandler(ROUTE, async (request, ctx) => {
  if (!validateCsrf(request as NextRequest)) {
    return csrfError('Request blocked: invalid origin');
  }

  const communityId = extractCommunityId(request);

  // Verify session auth
  const sessionUser = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!sessionUser) {
    return unauthorizedError('Authentication required to join a community', ctx.requestId);
  }

  const body = await request.json();
  const parseResult = joinRequestSchema.safeParse(body);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { userId, username, hiveUsername } = parseResult.data;

  // Verify the authenticated user matches the request
  if (sessionUser.userId !== userId) {
    return forbiddenError('Cannot join community as another user', ctx.requestId);
  }

  ctx.log.info('User joining community', { communityId, userId, username });

  // Check community type to determine initial status (accepts id or slug)
  const community = await resolveCommunity(communityId);
  if (!community) {
    return notFoundError(`Community not found: ${communityId}`, ctx.requestId);
  }

  const initialStatus = community.type === 'public' ? 'active' : 'pending';

  const member = await prisma.communityMember.create({
    data: {
      communityId: community.id,
      userId,
      username,
      hiveUsername: hiveUsername || null,
      role: 'member',
      status: initialStatus,
    },
  });

  // Increment member count if immediately active
  if (initialStatus === 'active') {
    await prisma.community.update({
      where: { id: community.id },
      data: { memberCount: { increment: 1 } },
    });
  }

  const statusMessage =
    member.status === 'pending'
      ? 'Join request submitted. Waiting for approval.'
      : 'Successfully joined the community.';

  return NextResponse.json(
    {
      success: true,
      member,
      message: statusMessage,
    },
    { status: 201 }
  );
});

/**
 * PATCH /api/communities/[id]/members - Update member (approve, promote, ban, etc.)
 */
export const PATCH = createApiHandler(ROUTE, async (request, ctx) => {
  if (!validateCsrf(request as NextRequest)) {
    return csrfError('Request blocked: invalid origin');
  }

  const communityId = extractCommunityId(request);

  // Verify session auth
  const sessionUser = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!sessionUser) {
    return unauthorizedError('Authentication required', ctx.requestId);
  }

  const body = await request.json();
  const parseResult = updateMemberSchema.safeParse(body);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { action, targetUserId, role, userId } = parseResult.data;

  // Verify the authenticated user matches the request
  if (sessionUser.userId !== userId) {
    return forbiddenError('Cannot perform actions as another user', ctx.requestId);
  }

  // Check if community exists (accepts id or slug)
  const community = await resolveCommunity(communityId);
  if (!community) {
    return notFoundError(`Community not found: ${communityId}`, ctx.requestId);
  }
  const resolvedId = community.id;

  // Check if requesting user has permission
  const requesterMembership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId: resolvedId, userId } },
  });
  if (!requesterMembership || requesterMembership.status !== 'active') {
    return forbiddenError('You must be an active member to perform this action', ctx.requestId);
  }

  const isAdmin = requesterMembership.role === 'admin';
  const isModerator = requesterMembership.role === 'moderator' || isAdmin;

  ctx.log.info('Member action', {
    communityId,
    action,
    targetUserId,
    userId,
    isAdmin,
    isModerator,
  });

  switch (action) {
    case 'approve':
    case 'reject':
      if (!isModerator) {
        return forbiddenError('Only moderators can approve or reject members', ctx.requestId);
      }
      if (action === 'approve') {
        const member = await prisma.communityMember.update({
          where: { communityId_userId: { communityId: resolvedId, userId: targetUserId } },
          data: { status: 'active' },
        });
        // Increment member count
        await prisma.community.update({
          where: { id: resolvedId },
          data: { memberCount: { increment: 1 } },
        });
        return NextResponse.json({ success: true, member, message: 'Member approved' });
      } else {
        // For reject, remove the pending membership
        await prisma.communityMember.delete({
          where: { communityId_userId: { communityId: resolvedId, userId: targetUserId } },
        });
        return NextResponse.json({ success: true, message: 'Join request rejected' });
      }

    case 'promote':
    case 'demote': {
      if (!isAdmin) {
        return forbiddenError('Only admins can change member roles', ctx.requestId);
      }
      if (!role) {
        return validationError('Role is required for promote/demote actions', ctx.requestId);
      }
      const updatedMember = await prisma.communityMember.update({
        where: { communityId_userId: { communityId: resolvedId, userId: targetUserId } },
        data: { role },
      });
      return NextResponse.json({
        success: true,
        member: updatedMember,
        message: `Member role updated to ${role}`,
      });
    }

    case 'ban':
      if (!isModerator) {
        return forbiddenError('Only moderators can ban members', ctx.requestId);
      }
      await prisma.communityMember.update({
        where: { communityId_userId: { communityId: resolvedId, userId: targetUserId } },
        data: { status: 'banned' },
      });
      // Decrement member count (clamped to 0 via gt guard)
      await prisma.community.updateMany({
        where: { id: resolvedId, memberCount: { gt: 0 } },
        data: { memberCount: { decrement: 1 } },
      });
      return NextResponse.json({ success: true, message: 'Member banned' });

    case 'unban': {
      if (!isAdmin) {
        return forbiddenError('Only admins can unban members', ctx.requestId);
      }
      // For unban, restore member to active status
      const targetMembership = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: resolvedId, userId: targetUserId } },
      });
      if (targetMembership) {
        await prisma.communityMember.update({
          where: { communityId_userId: { communityId: resolvedId, userId: targetUserId } },
          data: { role: 'member', status: 'active' },
        });
      }
      return NextResponse.json({ success: true, message: 'Member unbanned' });
    }

    default:
      return validationError(`Unknown action: ${action}`, ctx.requestId);
  }
});

/**
 * DELETE /api/communities/[id]/members - Leave a community
 */
export const DELETE = createApiHandler(ROUTE, async (request, ctx) => {
  if (!validateCsrf(request as NextRequest)) {
    return csrfError('Request blocked: invalid origin');
  }

  const communityId = extractCommunityId(request);

  // Verify session auth
  const sessionUser = await getAuthenticatedUserFromSession(request as NextRequest);
  if (!sessionUser) {
    return unauthorizedError('Authentication required', ctx.requestId);
  }

  const body = await request.json();
  const parseResult = leaveRequestSchema.safeParse(body);

  if (!parseResult.success) {
    return validationError(parseResult.error, ctx.requestId);
  }

  const { userId } = parseResult.data;

  // Verify the authenticated user matches the request
  if (sessionUser.userId !== userId) {
    return forbiddenError('Cannot leave community as another user', ctx.requestId);
  }

  // Resolve slug or id to canonical community id
  const community = await resolveCommunity(communityId);
  if (!community) {
    return notFoundError(`Community not found: ${communityId}`, ctx.requestId);
  }

  ctx.log.info('User leaving community', { communityId: community.id, userId });

  await prisma.communityMember.delete({
    where: { communityId_userId: { communityId: community.id, userId } },
  });

  // Decrement member count (clamped to 0 via gt guard)
  await prisma.community.updateMany({
    where: { id: community.id, memberCount: { gt: 0 } },
    data: { memberCount: { decrement: 1 } },
  });

  return NextResponse.json({
    success: true,
    message: 'Successfully left the community',
  });
});
