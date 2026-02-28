import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { createRequestContext, validationError } from '@/lib/api/response';
import { SoftPost } from '@/types/auth';
// Use SportsblockPost from workerbee/content which matches what the content functions return
import { SportsblockPost } from '@/lib/hive-workerbee/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/unified/posts';

// ============================================
// Prisma helpers for querying soft posts
// ============================================

// Select all columns except `content` for list queries (content is 10-50KB per post).
const LIST_SELECT = {
  id: true,
  authorId: true,
  authorUsername: true,
  authorDisplayName: true,
  authorAvatar: true,
  title: true,
  excerpt: true,
  permlink: true,
  tags: true,
  sportCategory: true,
  featuredImage: true,
  communityId: true,
  communitySlug: true,
  communityName: true,
  createdAt: true,
  updatedAt: true,
  isPublishedToHive: true,
  hivePermlink: true,
  viewCount: true,
  likeCount: true,
} as const;

async function getSoftPostsByUsername(
  username: string,
  postsLimit: number,
  before?: string,
  excludePublishedToHive = false
): Promise<SoftPost[]> {
  const posts = await prisma.post.findMany({
    select: LIST_SELECT,
    where: {
      authorUsername: username,
      ...(before && { createdAt: { lt: new Date(before) } }),
      ...(excludePublishedToHive && { isPublishedToHive: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: postsLimit,
  });

  return posts.map(postToSoftPost);
}

async function getSoftPostsByAuthorId(
  authorId: string,
  postsLimit: number,
  before?: string,
  excludePublishedToHive = false
): Promise<SoftPost[]> {
  const posts = await prisma.post.findMany({
    select: LIST_SELECT,
    where: {
      authorId,
      ...(before && { createdAt: { lt: new Date(before) } }),
      ...(excludePublishedToHive && { isPublishedToHive: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: postsLimit,
  });

  return posts.map(postToSoftPost);
}

async function getAllSoftPosts(
  postsLimit: number,
  before?: string,
  excludePublishedToHive = false
): Promise<SoftPost[]> {
  const where: Record<string, unknown> = {};
  if (before) where.createdAt = { lt: new Date(before) };
  if (excludePublishedToHive) where.isPublishedToHive = false;

  const posts = await prisma.post.findMany({
    select: LIST_SELECT,
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { createdAt: 'desc' },
    take: postsLimit,
  });

  return posts.map(postToSoftPost);
}

function postToSoftPost(post: {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatar: string | null;
  title: string;
  excerpt: string | null;
  permlink: string;
  tags: string[];
  sportCategory: string | null;
  featuredImage: string | null;
  communityId: string | null;
  communitySlug: string | null;
  communityName: string | null;
  createdAt: Date;
  updatedAt: Date;
  isPublishedToHive: boolean;
  hivePermlink: string | null;
  viewCount: number;
  likeCount: number;
}): SoftPost {
  return {
    id: post.id,
    authorId: post.authorId,
    authorUsername: post.authorUsername || 'unknown',
    authorDisplayName: post.authorDisplayName ?? undefined,
    authorAvatar: post.authorAvatar ?? undefined,
    title: post.title,
    content: post.excerpt || '',
    excerpt: post.excerpt ?? undefined,
    permlink: post.permlink,
    tags: post.tags || [],
    sportCategory: post.sportCategory ?? undefined,
    featuredImage: post.featuredImage ?? undefined,
    communityId: post.communityId ?? undefined,
    communitySlug: post.communitySlug ?? undefined,
    communityName: post.communityName ?? undefined,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    isPublishedToHive: post.isPublishedToHive || false,
    hivePermlink: post.hivePermlink ?? undefined,
    viewCount: post.viewCount || 0,
    likeCount: post.likeCount || 0,
  } as SoftPost;
}

// ============================================
// Validation Schemas
// ============================================

const unifiedPostsQuerySchema = z.object({
  username: z.string().min(1).max(50).optional(),
  authorId: z.string().min(1).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  before: z.string().datetime({ offset: true }).optional(),
  includeHive: z
    .string()
    .optional()
    .transform((val) => val !== 'false')
    .pipe(z.boolean()),
  includeSoft: z
    .string()
    .optional()
    .transform((val) => val !== 'false')
    .pipe(z.boolean()),
  sportCategory: z.string().min(1).optional(),
});

/**
 * Unified post type that can represent both Hive and Soft posts
 */
export interface UnifiedPost {
  // Common identifiers
  id: string;
  author: string;
  permlink: string;

  // Content
  title: string;
  body: string;
  excerpt?: string;

  // Metadata
  created: string;
  tags: string[];
  sportCategory?: string;
  featuredImage?: string;

  // Author info
  authorDisplayName?: string;
  authorAvatar?: string;

  // Engagement
  viewCount?: number;
  likeCount?: number;
  netVotes?: number;
  children?: number;
  pendingPayout?: string;

  // Source identification
  source: 'hive' | 'soft';
  isHivePost: boolean;
  isSoftPost: boolean;

  // For soft posts - original data for reference
  softPostId?: string;

  // For Hive posts - pass through key fields
  activeVotes?: Array<{
    voter: string;
    weight: number;
    percent: number;
  }>;
}

/**
 * Convert a SoftPost to UnifiedPost format
 */
function softPostToUnified(post: SoftPost): UnifiedPost {
  return {
    id: `soft-${post.id}`,
    author: post.authorUsername || 'unknown',
    permlink: post.permlink,
    title: post.title,
    body: post.excerpt || '',
    excerpt: post.excerpt,
    created:
      post.createdAt instanceof Date
        ? post.createdAt.toISOString()
        : new Date(post.createdAt).toISOString(),
    tags: post.tags || [],
    sportCategory: post.sportCategory,
    featuredImage: post.featuredImage,
    authorDisplayName: post.authorDisplayName,
    authorAvatar: post.authorAvatar,
    viewCount: post.viewCount || 0,
    likeCount: post.likeCount || 0,
    source: 'soft',
    isHivePost: false,
    isSoftPost: true,
    softPostId: post.id,
  };
}

/**
 * Convert a SportsblockPost (Hive) to UnifiedPost format
 */
function hivePostToUnified(post: SportsblockPost): UnifiedPost {
  // Parse metadata for images and tags
  let featuredImage: string | undefined;
  let tags: string[] = [];

  try {
    const metadata =
      typeof post.json_metadata === 'string' ? JSON.parse(post.json_metadata) : post.json_metadata;
    if (metadata?.image && metadata.image.length > 0) {
      featuredImage = metadata.image[0];
    }
    if (metadata?.tags && Array.isArray(metadata.tags)) {
      tags = metadata.tags;
    }
  } catch {
    // Ignore metadata parsing errors
  }

  // Generate excerpt from body
  const excerpt =
    post.body
      .replace(/[#*_`~\[\]()>]/g, '')
      .substring(0, 200)
      .trim() + (post.body.length > 200 ? '...' : '');

  return {
    id: `hive-${post.author}-${post.permlink}`,
    author: post.author,
    permlink: post.permlink,
    title: post.title,
    body: post.body,
    excerpt,
    created: post.created,
    tags,
    sportCategory: post.sportCategory,
    featuredImage,
    netVotes: post.net_votes,
    children: post.children,
    pendingPayout: post.pending_payout_value,
    source: 'hive',
    isHivePost: true,
    isSoftPost: false,
    activeVotes: post.active_votes?.slice(0, 10).map((v) => ({
      voter: v.voter,
      weight: v.weight,
      percent: v.percent,
    })),
  };
}

/**
 * GET /api/unified/posts - Fetch posts from both Hive and database
 *
 * Query params:
 * - username: string (fetch by author username)
 * - authorId: string (fetch by database author ID - soft posts only)
 * - limit: number (default 20, max 100)
 * - includeHive: boolean (default true)
 * - includeSoft: boolean (default true)
 * - sportCategory: string (filter by sport)
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = unifiedPostsQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { username, authorId, limit, before, includeHive, includeSoft, sportCategory } =
      parseResult.data;

    ctx.log.debug('Fetching unified posts', {
      username,
      authorId,
      limit,
      includeHive,
      includeSoft,
      sportCategory,
    });

    const allPosts: UnifiedPost[] = [];

    const cacheHeaders = {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    };

    // If authorId is provided, only fetch soft posts
    if (authorId) {
      if (includeSoft) {
        const softPosts = await getSoftPostsByAuthorId(authorId, limit + 1, before, includeHive);
        allPosts.push(...softPosts.map(softPostToUnified));
      }

      const hasMore = allPosts.length > limit;
      const sliced = allPosts.slice(0, limit);
      const nextCursor =
        hasMore && sliced.length > 0 ? sliced[sliced.length - 1].created : undefined;

      return NextResponse.json(
        {
          success: true,
          posts: sliced,
          count: sliced.length,
          hasMore,
          nextCursor,
          sources: { hive: 0, soft: sliced.length },
        },
        { headers: cacheHeaders }
      );
    }

    // If username is provided, check both systems
    if (username) {
      // Start profile check and soft post fetch in parallel
      const fetchPromises: Promise<void>[] = [];

      // Soft posts don't depend on profile -- start immediately
      if (includeSoft) {
        fetchPromises.push(
          getSoftPostsByUsername(username, limit + 1, before, includeHive)
            .then((posts) => {
              allPosts.push(...posts.map(softPostToUnified));
            })
            .catch((error) => {
              ctx.log.warn('Failed to fetch soft posts', { error, username });
            })
        );
      }

      // Profile check runs in parallel with soft post fetch
      const profilePromise = prisma.profile.findUnique({ where: { username } });

      // Fetch Hive posts if enabled -- gate on profile result to skip for soft-only users
      if (includeHive) {
        fetchPromises.push(
          (async () => {
            try {
              const softProfile = await profilePromise;
              const isSoftUser = softProfile && !softProfile.isHiveUser;
              if (isSoftUser) return;

              const { getUserPosts } = await import('@/lib/hive-workerbee/content');
              const hivePosts = await retryWithBackoff(() => getUserPosts(username, limit), {
                maxRetries: 1,
                initialDelay: 500,
                maxDelay: 2000,
                backoffMultiplier: 2,
              });
              if (hivePosts && hivePosts.length > 0) {
                allPosts.push(...hivePosts.map(hivePostToUnified));
              }
            } catch (error) {
              ctx.log.warn('Failed to fetch Hive posts', { error, username });
            }
          })()
        );
      }

      await Promise.all(fetchPromises);
      const softProfile = await profilePromise;
      const isSoftUser = softProfile && !softProfile.isHiveUser;

      // Filter by cursor date if paginating
      if (before) {
        const beforeDate = new Date(before).getTime();
        // Hive posts aren't filtered at the API level, so filter here
        const hiveBefore = allPosts.filter(
          (p) => p.source !== 'hive' || new Date(p.created).getTime() < beforeDate
        );
        allPosts.length = 0;
        allPosts.push(...hiveBefore);
      }

      // Sort by created date (newest first)
      allPosts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      const hasMore = allPosts.length > limit;
      const sliced = allPosts.slice(0, limit);
      const nextCursor =
        hasMore && sliced.length > 0 ? sliced[sliced.length - 1].created : undefined;

      const hivePosts = sliced.filter((p) => p.source === 'hive');
      const softPosts = sliced.filter((p) => p.source === 'soft');

      return NextResponse.json(
        {
          success: true,
          posts: sliced,
          count: sliced.length,
          hasMore,
          nextCursor,
          sources: { hive: hivePosts.length, soft: softPosts.length },
          isSoftUser,
        },
        { headers: cacheHeaders }
      );
    }

    // No username - fetch general feed
    const fetchPromises: Promise<void>[] = [];

    // Fetch soft posts
    if (includeSoft) {
      fetchPromises.push(
        getAllSoftPosts(limit + 1, before, includeHive)
          .then((posts) => {
            let filtered = posts;
            if (sportCategory) {
              filtered = posts.filter((p) => p.sportCategory === sportCategory);
            }
            allPosts.push(...filtered.map(softPostToUnified));
          })
          .catch((error) => {
            ctx.log.warn('Failed to fetch soft posts feed', { error });
          })
      );
    }

    // Fetch Hive posts
    if (includeHive) {
      fetchPromises.push(
        (async () => {
          try {
            const { fetchSportsblockPosts } = await import('@/lib/hive-workerbee/content');
            const result = await retryWithBackoff(
              () => fetchSportsblockPosts({ limit, sportCategory }),
              { maxRetries: 1, initialDelay: 500, maxDelay: 2000, backoffMultiplier: 2 }
            );
            if (result.posts && result.posts.length > 0) {
              allPosts.push(...result.posts.map(hivePostToUnified));
            }
          } catch (error) {
            ctx.log.warn('Failed to fetch Hive posts feed', { error });
          }
        })()
      );
    }

    await Promise.all(fetchPromises);

    // Filter Hive posts by cursor date if paginating
    if (before) {
      const beforeDate = new Date(before).getTime();
      const filtered = allPosts.filter(
        (p) => p.source !== 'hive' || new Date(p.created).getTime() < beforeDate
      );
      allPosts.length = 0;
      allPosts.push(...filtered);
    }

    // Sort by created date (newest first)
    allPosts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    const hasMore = allPosts.length > limit;
    const sliced = allPosts.slice(0, limit);
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].created : undefined;

    const hivePosts = sliced.filter((p) => p.source === 'hive');
    const softPosts = sliced.filter((p) => p.source === 'soft');

    return NextResponse.json(
      {
        success: true,
        posts: sliced,
        count: sliced.length,
        hasMore,
        nextCursor,
        sources: { hive: hivePosts.length, soft: softPosts.length },
      },
      { headers: cacheHeaders }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
