import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FirebaseCommunitiesAdmin } from '@/lib/firebase/communities-admin';
import {
  createRequestContext,
  validationError,
  notFoundError,
  forbiddenError,
  unauthorizedError,
} from '@/lib/api/response';
import { validateCsrf, csrfError } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { CommunityMemberRole, CommunityMemberStatus } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/communities/[id]/members';

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
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = createRequestContext(ROUTE);
  const { id: communityId } = await params;

  try {
    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = listMembersSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { status, role, limit, userId } = parseResult.data;

    // Check if community exists
    const community = await FirebaseCommunitiesAdmin.getCommunityById(communityId);
    if (!community) {
      return notFoundError(`Community not found: ${communityId}`, ctx.requestId);
    }

    // If userId is provided, lookup single membership directly
    if (userId) {
      ctx.log.debug('Looking up single membership', { communityId, userId });

      const membership = await FirebaseCommunitiesAdmin.getMembership(communityId, userId);

      return NextResponse.json({
        success: true,
        membership: membership || null,
        isMember: !!membership && membership.status === 'active',
      });
    }

    // Otherwise, list all members
    ctx.log.debug('Listing community members', { communityId, status, role, limit });

    const members = await FirebaseCommunitiesAdmin.getCommunityMembers(communityId, {
      status: status as CommunityMemberStatus | undefined,
      role: role as CommunityMemberRole | undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      members,
      count: members.length,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * POST /api/communities/[id]/members - Join a community
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  const ctx = createRequestContext(ROUTE);
  const { id: communityId } = await params;

  try {
    // Verify session auth
    const sessionUser = await getAuthenticatedUserFromSession(request);
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

    const member = await FirebaseCommunitiesAdmin.joinCommunity(
      communityId,
      userId,
      username,
      hiveUsername
    );

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
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * PATCH /api/communities/[id]/members - Update member (approve, promote, ban, etc.)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  const ctx = createRequestContext(ROUTE);
  const { id: communityId } = await params;

  try {
    // Verify session auth
    const sessionUser = await getAuthenticatedUserFromSession(request);
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

    // Check if community exists
    const community = await FirebaseCommunitiesAdmin.getCommunityById(communityId);
    if (!community) {
      return notFoundError(`Community not found: ${communityId}`, ctx.requestId);
    }

    // Check if requesting user has permission
    const requesterMembership = await FirebaseCommunitiesAdmin.getMembership(communityId, userId);
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
          const member = await FirebaseCommunitiesAdmin.approveMember(communityId, targetUserId);
          return NextResponse.json({ success: true, member, message: 'Member approved' });
        } else {
          // For reject, we just remove the pending membership
          await FirebaseCommunitiesAdmin.leaveCommunity(communityId, targetUserId);
          return NextResponse.json({ success: true, message: 'Join request rejected' });
        }

      case 'promote':
      case 'demote':
        if (!isAdmin) {
          return forbiddenError('Only admins can change member roles', ctx.requestId);
        }
        if (!role) {
          return validationError('Role is required for promote/demote actions', ctx.requestId);
        }
        const updatedMember = await FirebaseCommunitiesAdmin.updateMemberRole(
          communityId,
          targetUserId,
          role
        );
        return NextResponse.json({
          success: true,
          member: updatedMember,
          message: `Member role updated to ${role}`,
        });

      case 'ban':
        if (!isModerator) {
          return forbiddenError('Only moderators can ban members', ctx.requestId);
        }
        await FirebaseCommunitiesAdmin.banMember(communityId, targetUserId);
        return NextResponse.json({ success: true, message: 'Member banned' });

      case 'unban':
        if (!isAdmin) {
          return forbiddenError('Only admins can unban members', ctx.requestId);
        }
        // For unban, update the status back to pending (they need to rejoin)
        const targetMembership = await FirebaseCommunitiesAdmin.getMembership(
          communityId,
          targetUserId
        );
        if (targetMembership) {
          await FirebaseCommunitiesAdmin.updateMemberRole(communityId, targetUserId, 'member');
        }
        return NextResponse.json({ success: true, message: 'Member unbanned' });

      default:
        return validationError(`Unknown action: ${action}`, ctx.requestId);
    }
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * DELETE /api/communities/[id]/members - Leave a community
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateCsrf(request)) {
    return csrfError('Request blocked: invalid origin');
  }

  const ctx = createRequestContext(ROUTE);
  const { id: communityId } = await params;

  try {
    // Verify session auth
    const sessionUser = await getAuthenticatedUserFromSession(request);
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

    ctx.log.info('User leaving community', { communityId, userId });

    await FirebaseCommunitiesAdmin.leaveCommunity(communityId, userId);

    return NextResponse.json({
      success: true,
      message: 'Successfully left the community',
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
