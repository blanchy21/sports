import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FirebaseCommunitiesAdmin } from '@/lib/firebase/communities-admin';
import {
  createRequestContext,
  validationError,
  notFoundError,
  forbiddenError,
} from '@/lib/api/response';

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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = createRequestContext(ROUTE);
  const { id } = await params;

  try {
    ctx.log.debug('Fetching community', { id });

    // Try to fetch by ID first, then by slug
    let community = await FirebaseCommunitiesAdmin.getCommunityById(id);
    
    if (!community) {
      community = await FirebaseCommunitiesAdmin.getCommunityBySlug(id);
    }

    if (!community) {
      return notFoundError(`Community not found: ${id}`, ctx.requestId);
    }

    // Fetch team members (admins and moderators)
    const members = await FirebaseCommunitiesAdmin.getCommunityMembers(community.id, {
      status: 'active',
      limit: 10,
    });

    // Build team array for backward compatibility
    const team = members
      .filter((m) => m.role === 'admin' || m.role === 'moderator')
      .map((m) => ({
        username: m.username,
        role: m.role,
        joinedAt: typeof m.joinedAt === 'string' ? m.joinedAt : (m.joinedAt as Date).toISOString(),
      }));

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
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = createRequestContext(ROUTE);
  const { id } = await params;

  try {
    const body = await request.json();
    const parseResult = updateCommunitySchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { userId, ...updates } = parseResult.data;

    // Fetch existing community
    const community = await FirebaseCommunitiesAdmin.getCommunityById(id);
    if (!community) {
      return notFoundError(`Community not found: ${id}`, ctx.requestId);
    }

    // Check if user is admin
    const membership = await FirebaseCommunitiesAdmin.getMembership(id, userId);
    if (!membership || membership.role !== 'admin' || membership.status !== 'active') {
      return forbiddenError('Only admins can update this community', ctx.requestId);
    }

    ctx.log.info('Updating community', { id, updates, userId });

    // Convert null values to undefined for the update function
    const sanitizedUpdates = {
      ...updates,
      avatar: updates.avatar === null ? undefined : updates.avatar,
      coverImage: updates.coverImage === null ? undefined : updates.coverImage,
    };

    const updatedCommunity = await FirebaseCommunitiesAdmin.updateCommunity(id, sanitizedUpdates);

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
  const ctx = createRequestContext(ROUTE);
  const { id } = await params;

  try {
    const body = await request.json();
    const parseResult = deleteRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { userId } = parseResult.data;

    // Fetch existing community
    const community = await FirebaseCommunitiesAdmin.getCommunityById(id);
    if (!community) {
      return notFoundError(`Community not found: ${id}`, ctx.requestId);
    }

    // Only the creator can delete
    if (community.createdBy !== userId) {
      return forbiddenError('Only the community creator can delete this community', ctx.requestId);
    }

    ctx.log.info('Deleting community', { id, userId });

    await FirebaseCommunitiesAdmin.deleteCommunity(id);

    return NextResponse.json({
      success: true,
      message: 'Community deleted successfully',
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
