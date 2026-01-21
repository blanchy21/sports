import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FirebasePosts, CreateSoftPostInput } from '@/lib/firebase/posts';
import {
  createRequestContext,
  validationError,
  unauthorizedError,
  forbiddenError,
  internalError,
} from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/posts';

// ============================================
// Validation Schemas
// ============================================

const getPostsQuerySchema = z.object({
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20).pipe(z.number().int().min(1).max(100)),
  authorId: z.string().min(1).optional(),
  communityId: z.string().min(1).optional(),
});

const createPostSchema = z.object({
  // Auth - user must provide their ID
  authorId: z.string().min(1, 'Author ID is required'),
  authorUsername: z.string().min(1, 'Author username is required').max(50, 'Username too long'),
  authorDisplayName: z.string().max(100, 'Display name too long').optional(),
  authorAvatar: z.string().url('Invalid avatar URL').optional().nullable(),

  // Content
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .transform((val) => val.trim()),
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content too long')
    .transform((val) => val.trim()),

  // Metadata
  tags: z.array(
    z.string()
      .min(1)
      .max(50, 'Tag too long')
      .regex(/^[a-z0-9-]+$/, 'Tags must be lowercase alphanumeric with hyphens')
  ).max(10, 'Maximum 10 tags allowed').optional().default([]),
  sportCategory: z.string().max(50, 'Category too long').optional(),
  featuredImage: z.string().url('Invalid featured image URL').optional().nullable(),

  // Community association
  communityId: z.string().min(1).optional(),
  communitySlug: z.string().min(1).max(100).optional(),
  communityName: z.string().min(1).max(100).optional(),
});

type CreatePostInput = z.infer<typeof createPostSchema>;

/**
 * GET /api/posts - Fetch soft posts (non-Hive posts stored in Firebase)
 *
 * Query params:
 * - limit: number (default 20, max 100)
 * - authorId: string (filter by author)
 * - communityId: string (filter by community)
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getPostsQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { limit, authorId, communityId } = parseResult.data;

    ctx.log.debug('Fetching posts', { limit, authorId, communityId });

    let posts;

    if (authorId) {
      posts = await FirebasePosts.getPostsByAuthor(authorId);
    } else if (communityId) {
      posts = await FirebasePosts.getPostsByCommunity(communityId, limit);
    } else {
      posts = await FirebasePosts.getAllPosts(limit);
    }

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

/**
 * POST /api/posts - Create a new soft post (for non-Hive users)
 *
 * Requires authenticated user. The authorId must match the authenticated user.
 */
export async function POST(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    // Parse JSON body with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError('Invalid JSON body', ctx.requestId);
    }

    // Validate request body
    const parseResult = createPostSchema.safeParse(body);
    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const data = parseResult.data;

    // Authorization check: Verify user identity
    // The client should pass the authenticated user's ID in a header
    const authenticatedUserId = request.headers.get('x-user-id');

    if (!authenticatedUserId) {
      return unauthorizedError('Authentication required. Please provide x-user-id header.', ctx.requestId);
    }

    // Verify the authenticated user matches the author
    if (authenticatedUserId !== data.authorId) {
      ctx.log.warn('Authorization failed: user ID mismatch', {
        authenticatedUserId,
        requestedAuthorId: data.authorId,
      });
      return forbiddenError('You can only create posts as yourself', ctx.requestId);
    }

    ctx.log.info('Creating post', {
      authorId: data.authorId,
      authorUsername: data.authorUsername,
      title: data.title.substring(0, 50),
      communityId: data.communityId,
    });

    // Build the input for Firebase
    const input: CreateSoftPostInput = {
      authorId: data.authorId,
      authorUsername: data.authorUsername,
      authorDisplayName: data.authorDisplayName,
      authorAvatar: data.authorAvatar ?? undefined,
      title: data.title,
      content: data.content,
      tags: data.tags,
      sportCategory: data.sportCategory,
      featuredImage: data.featuredImage ?? undefined,
      communityId: data.communityId,
      communitySlug: data.communitySlug,
      communityName: data.communityName,
    };

    const post = await FirebasePosts.createPost(input);

    ctx.log.info('Post created successfully', { postId: post.id });

    return NextResponse.json(
      {
        success: true,
        post,
        message: 'Post created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
