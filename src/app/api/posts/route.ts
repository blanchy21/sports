import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebasePosts } from '@/lib/firebase/posts';
import { getAdminDb } from '@/lib/firebase/admin';
import { updateUserLastActiveAt } from '@/lib/firebase/profiles';
import {
  createRequestContext,
  validationError,
  unauthorizedError,
  forbiddenError,
} from '@/lib/api/response';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/posts';

// Soft user post limits
const FREE_POST_LIMIT = 50;
const WARNING_THRESHOLD = 40;

// ============================================
// Validation Schemas
// ============================================

const getPostsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
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
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .transform((val) => val.trim()),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(50000, 'Content too long')
    .transform((val) => val.trim()),

  // Metadata
  tags: z
    .array(
      z
        .string()
        .min(1)
        .max(50, 'Tag too long')
        .regex(/^[a-z0-9-]+$/, 'Tags must be lowercase alphanumeric with hyphens')
    )
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  sportCategory: z.string().max(50, 'Category too long').optional(),
  featuredImage: z.string().url('Invalid featured image URL').optional().nullable(),

  // Community association
  communityId: z.string().min(1).optional(),
  communitySlug: z.string().min(1).max(100).optional(),
  communityName: z.string().min(1).max(100).optional(),
});

// Type is inferred from schema validation

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
  return withCsrfProtection(request, async () => {
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

      // Authorization check: Verify user identity from session cookie
      const sessionUser = await getAuthenticatedUserFromSession(request);

      if (!sessionUser) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const authenticatedUserId = sessionUser.userId;

      // Verify the authenticated user matches the author
      if (authenticatedUserId !== data.authorId) {
        ctx.log.warn('Authorization failed: user ID mismatch', {
          authenticatedUserId,
          requestedAuthorId: data.authorId,
        });
        return forbiddenError('You can only create posts as yourself', ctx.requestId);
      }

      // Rate limiting check
      const rateLimit = checkRateLimit(authenticatedUserId, RATE_LIMITS.posts);
      if (!rateLimit.allowed) {
        ctx.log.warn('Rate limit exceeded', {
          authorId: authenticatedUserId,
          count: rateLimit.count,
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'You are posting too frequently. Please wait before creating another post.',
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: getRateLimitHeaders(rateLimit),
          }
        );
      }

      // Use Admin SDK to check post count (bypasses security rules)
      const adminDbForCount = getAdminDb();
      if (!adminDbForCount) {
        ctx.log.error('Firebase Admin SDK not configured');
        return NextResponse.json(
          { success: false, error: 'Server configuration error' },
          { status: 500 }
        );
      }

      // Check post limit for soft users
      const postsSnapshot = await adminDbForCount
        .collection('soft_posts')
        .where('authorId', '==', data.authorId)
        .count()
        .get();
      const currentPostCount = postsSnapshot.data().count;

      if (currentPostCount >= FREE_POST_LIMIT) {
        ctx.log.warn('Post limit reached', {
          authorId: data.authorId,
          currentCount: currentPostCount,
          limit: FREE_POST_LIMIT,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Post limit reached',
            message: `You've reached the limit of ${FREE_POST_LIMIT} posts. Upgrade to Hive for unlimited posts and earn rewards!`,
            limitReached: true,
            currentCount: currentPostCount,
            limit: FREE_POST_LIMIT,
          },
          { status: 403 }
        );
      }

      // Calculate remaining posts and warning state
      const remainingPosts = FREE_POST_LIMIT - currentPostCount - 1; // -1 for the post being created
      const isNearLimit = currentPostCount >= WARNING_THRESHOLD;

      ctx.log.info('Creating post', {
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        title: data.title.substring(0, 50),
        communityId: data.communityId,
      });

      // Use Admin SDK to bypass Firestore security rules
      const adminDb = getAdminDb();
      if (!adminDb) {
        ctx.log.error('Firebase Admin SDK not configured');
        return NextResponse.json(
          { success: false, error: 'Server configuration error' },
          { status: 500 }
        );
      }

      // Generate a unique permlink
      const permlink = `${data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 50)}-${Date.now()}`;

      // Generate excerpt from content (first 200 chars, strip markdown)
      const excerpt =
        data.content
          .replace(/[#*_`~\[\]()>]/g, '')
          .substring(0, 200)
          .trim() + (data.content.length > 200 ? '...' : '');

      const postData = {
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        authorDisplayName: data.authorDisplayName || data.authorUsername,
        authorAvatar: data.authorAvatar || null,
        title: data.title,
        content: data.content,
        excerpt,
        permlink,
        tags: data.tags || [],
        sportCategory: data.sportCategory || null,
        featuredImage: data.featuredImage || null,
        communityId: data.communityId || null,
        communitySlug: data.communitySlug || null,
        communityName: data.communityName || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isPublishedToHive: false,
        hivePermlink: null,
        viewCount: 0,
        likeCount: 0,
      };

      const docRef = await adminDb.collection('soft_posts').add(postData);

      const post = {
        id: docRef.id,
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        authorDisplayName: data.authorDisplayName || data.authorUsername,
        authorAvatar: data.authorAvatar,
        title: data.title,
        content: data.content,
        excerpt,
        permlink,
        tags: data.tags || [],
        sportCategory: data.sportCategory,
        featuredImage: data.featuredImage,
        communityId: data.communityId,
        communitySlug: data.communitySlug,
        communityName: data.communityName,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublishedToHive: false,
        hivePermlink: undefined,
        viewCount: 0,
        likeCount: 0,
      };

      // Update user's lastActiveAt timestamp
      await updateUserLastActiveAt(data.authorId);

      ctx.log.info('Post created successfully', { postId: post.id });

      return NextResponse.json(
        {
          success: true,
          post,
          message: 'Post created successfully',
          // Include post limit info for UI feedback
          postLimitInfo: {
            currentCount: currentPostCount + 1, // Include the post just created
            limit: FREE_POST_LIMIT,
            remaining: remainingPosts,
            isNearLimit,
            upgradePrompt: isNearLimit
              ? `You have ${remainingPosts} post${remainingPosts === 1 ? '' : 's'} remaining. Upgrade to Hive for unlimited posts!`
              : null,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
