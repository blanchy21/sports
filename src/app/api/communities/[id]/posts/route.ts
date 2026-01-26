import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FirebaseCommunities } from '@/lib/firebase/communities';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  createRequestContext,
  validationError,
  notFoundError,
} from '@/lib/api/response';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import { SoftPost } from '@/types/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/communities/[id]/posts';

// ============================================
// Admin SDK helper for fetching soft posts by community
// ============================================

async function getSoftPostsByCommunity(communityId: string, postsLimit: number): Promise<SoftPost[]> {
  const db = getAdminDb();
  if (!db) {
    console.warn('[community/posts] Admin SDK not configured');
    return [];
  }

  try {
    const snapshot = await db
      .collection('soft_posts')
      .where('communityId', '==', communityId)
      .orderBy('createdAt', 'desc')
      .limit(postsLimit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        authorId: data.authorId,
        authorUsername: data.authorUsername || 'unknown',
        authorDisplayName: data.authorDisplayName,
        authorAvatar: data.authorAvatar,
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        permlink: data.permlink,
        tags: data.tags || [],
        sportCategory: data.sportCategory,
        featuredImage: data.featuredImage,
        communityId: data.communityId,
        communitySlug: data.communitySlug,
        communityName: data.communityName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        isPublishedToHive: data.isPublishedToHive || false,
        hivePermlink: data.hivePermlink || undefined,
        viewCount: data.viewCount || 0,
        likeCount: data.likeCount || 0,
      } as SoftPost;
    });
  } catch (error) {
    console.error('[community/posts] Error fetching soft posts by community:', error);
    return [];
  }
}

// ============================================
// Unified post type for community feed
// ============================================

interface CommunityPost {
  id: string;
  author: string;
  permlink: string;
  title: string;
  body: string;
  excerpt?: string;
  created: string;
  tags: string[];
  sportCategory?: string;
  featuredImage?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  viewCount?: number;
  likeCount?: number;
  netVotes?: number;
  children?: number;
  pendingPayout?: string;
  source: 'hive' | 'soft';
  _isSoftPost: boolean;
  _softPostId?: string;
  activeVotes?: Array<{
    voter: string;
    weight: number;
    percent: number;
  }>;
}

function softPostToCommunityPost(post: SoftPost): CommunityPost {
  return {
    id: `soft-${post.id}`,
    author: post.authorUsername || 'unknown',
    permlink: post.permlink,
    title: post.title,
    body: post.content,
    excerpt: post.excerpt,
    created: post.createdAt instanceof Date
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
    _isSoftPost: true,
    _softPostId: post.id,
  };
}

// Validation schemas
const postsQuerySchema = z.object({
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val, 10), 100) : 20),
  sort: z.enum(['created', 'trending', 'payout', 'votes']).optional().default('created'),
  before: z.string().optional(),
  includeHive: z.string().optional().transform((val) => val !== 'false'),
  includeSoft: z.string().optional().transform((val) => val !== 'false'),
});

/**
 * GET /api/communities/[id]/posts - Get posts for a community
 *
 * This route fetches posts from both Hive blockchain and soft posts (Firebase).
 * Posts are merged and sorted by creation date.
 *
 * Query params:
 * - limit: number (default 20, max 100)
 * - sort: 'created' | 'trending' | 'payout' | 'votes' (default 'created')
 * - before: string (cursor for pagination)
 * - includeHive: boolean (default true) - include Hive blockchain posts
 * - includeSoft: boolean (default true) - include soft/Firebase posts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = createRequestContext(ROUTE);
  const { id: communityId } = await params;

  try {
    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = postsQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { limit, sort, before, includeHive, includeSoft } = parseResult.data;

    // Fetch community to get slug
    let community = await FirebaseCommunities.getCommunityById(communityId);
    if (!community) {
      community = await FirebaseCommunities.getCommunityBySlug(communityId);
    }

    if (!community) {
      return notFoundError(`Community not found: ${communityId}`, ctx.requestId);
    }

    ctx.log.debug('Fetching community posts', {
      communityId: community.id,
      slug: community.slug,
      limit,
      sort,
      includeHive,
      includeSoft,
    });

    const allPosts: CommunityPost[] = [];
    const fetchPromises: Promise<void>[] = [];

    // Fetch soft posts from Firebase (using Admin SDK)
    if (includeSoft) {
      fetchPromises.push(
        getSoftPostsByCommunity(community.id, limit)
          .then(softPosts => {
            allPosts.push(...softPosts.map(softPostToCommunityPost));
          })
          .catch(error => {
            ctx.log.warn('Failed to fetch soft posts for community', { error, communityId: community.id });
          })
      );
    }

    // Fetch posts from Hive that have the community tag
    if (includeHive) {
      fetchPromises.push(
        (async () => {
          try {
            const { fetchSportsblockPosts } = await import('@/lib/hive-workerbee/content');

            const result = await retryWithBackoff(
              () => fetchSportsblockPosts({
                limit,
                sort,
                tag: community.slug,
                before,
              }),
              {
                maxRetries: 2,
                initialDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
              }
            );

            // Filter posts that have sub_community metadata matching this community
            const filteredPosts = result.posts.filter((post) => {
              try {
                const metadata = typeof post.json_metadata === 'string'
                  ? JSON.parse(post.json_metadata)
                  : post.json_metadata;

                // Match by sub_community slug or sub_community_id
                if (metadata?.sub_community === community.slug ||
                    metadata?.sub_community_id === community.id) {
                  return true;
                }

                // Also match by tag
                const tags = metadata?.tags || [];
                return tags.includes(community.slug);
              } catch {
                return false;
              }
            });

            // Convert Hive posts to CommunityPost format
            for (const post of filteredPosts) {
              let featuredImage: string | undefined;
              let tags: string[] = [];

              try {
                const metadata = typeof post.json_metadata === 'string'
                  ? JSON.parse(post.json_metadata)
                  : post.json_metadata;
                if (metadata?.image && metadata.image.length > 0) {
                  featuredImage = metadata.image[0];
                }
                if (metadata?.tags && Array.isArray(metadata.tags)) {
                  tags = metadata.tags;
                }
              } catch {
                // Ignore metadata parsing errors
              }

              const excerpt = post.body
                .replace(/[#*_`~\[\]()>]/g, '')
                .substring(0, 200)
                .trim() + (post.body.length > 200 ? '...' : '');

              allPosts.push({
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
                _isSoftPost: false,
                activeVotes: post.active_votes?.slice(0, 10).map(v => ({
                  voter: v.voter,
                  weight: v.weight,
                  percent: v.percent,
                })),
              });
            }
          } catch (error) {
            ctx.log.warn('Failed to fetch Hive posts for community', { error, communityId: community.id });
          }
        })()
      );
    }

    // Wait for all fetches to complete
    await Promise.all(fetchPromises);

    // Sort by created date (newest first)
    allPosts.sort((a, b) =>
      new Date(b.created).getTime() - new Date(a.created).getTime()
    );

    const hivePosts = allPosts.filter(p => p.source === 'hive');
    const softPosts = allPosts.filter(p => p.source === 'soft');

    return NextResponse.json({
      success: true,
      posts: allPosts.slice(0, limit),
      community: {
        id: community.id,
        slug: community.slug,
        name: community.name,
      },
      hasMore: allPosts.length > limit,
      count: Math.min(allPosts.length, limit),
      sources: { hive: hivePosts.length, soft: softPosts.length },
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
