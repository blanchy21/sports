import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import {
  createRequestContext,
  validationError,
  unauthorizedError,
  forbiddenError,
} from '@/lib/api/response';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { CommunityType } from '@/types';
import { Prisma } from '@/generated/prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/communities';

// Validation schemas
const listQuerySchema = z.object({
  search: z.string().max(100).optional(),
  sportCategory: z.string().max(50).optional(),
  type: z.enum(['public', 'private', 'invite-only']).optional(),
  sort: z.enum(['memberCount', 'postCount', 'createdAt', 'name']).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0)),
});

const createCommunitySchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  about: z
    .string()
    .min(10, 'About must be at least 10 characters')
    .max(500, 'About must be at most 500 characters'),
  description: z.string().max(5000).optional(),
  sportCategory: z.string().min(1, 'Sport category is required'),
  type: z.enum(['public', 'private', 'invite-only']),
  avatar: z.string().url('Invalid avatar URL').optional(),
  coverImage: z.string().url('Invalid cover image URL').optional(),
  // Auth info from client
  creatorId: z.string().min(1, 'Creator ID is required'),
  creatorUsername: z.string().min(1, 'Creator username is required'),
  hiveUsername: z.string().optional(),
});

/**
 * GET /api/communities - List communities with filters
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = listQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { search, sportCategory, type, sort, limit, offset } = parseResult.data;

    ctx.log.debug('Listing communities', { search, sportCategory, type, sort, limit });

    // Build where clause
    const where: Prisma.CommunityWhereInput = {};
    if (sportCategory) where.sportCategory = sportCategory;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { about: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    let orderBy: Prisma.CommunityOrderByWithRelationInput = { memberCount: 'desc' };
    if (sort === 'postCount') orderBy = { postCount: 'desc' };
    else if (sort === 'createdAt') orderBy = { createdAt: 'desc' };
    else if (sort === 'name') orderBy = { name: 'asc' };

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.community.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      communities,
      total,
      hasMore: offset + communities.length < total,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * POST /api/communities - Create a new community
 */
export async function POST(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const body = await request.json();
    const parseResult = createCommunitySchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const {
      name,
      slug,
      about,
      description,
      sportCategory,
      type,
      avatar,
      coverImage,
      creatorId,
      creatorUsername,
      hiveUsername,
    } = parseResult.data;

    // Verify user identity from session cookie
    const sessionUser = await getAuthenticatedUserFromSession(request);
    if (!sessionUser) {
      return unauthorizedError('Authentication required to create a community', ctx.requestId);
    }

    // Verify the authenticated user matches the claimed creator
    if (sessionUser.userId !== creatorId) {
      return forbiddenError('You can only create communities as yourself', ctx.requestId);
    }

    ctx.log.info('Creating community', { name, slug, sportCategory, type, creatorId });

    // Generate slug if not provided
    const communitySlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50);

    // Create community and add creator as admin member in a transaction
    const community = await prisma.$transaction(async (tx) => {
      const newCommunity = await tx.community.create({
        data: {
          name,
          slug: communitySlug,
          about,
          description: description || '',
          sportCategory,
          type,
          avatar: avatar || null,
          coverImage: coverImage || null,
          createdBy: creatorId,
          createdByHive: hiveUsername || null,
          memberCount: 1,
        },
      });

      // Add creator as admin member
      await tx.communityMember.create({
        data: {
          communityId: newCommunity.id,
          userId: creatorId,
          username: creatorUsername,
          hiveUsername: hiveUsername || null,
          role: 'admin',
          status: 'active',
        },
      });

      return newCommunity;
    });

    return NextResponse.json(
      {
        success: true,
        community,
      },
      { status: 201 }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
