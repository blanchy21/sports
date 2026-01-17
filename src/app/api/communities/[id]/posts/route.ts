import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FirebaseCommunities } from '@/lib/firebase/communities';
import {
  createRequestContext,
  validationError,
  notFoundError,
} from '@/lib/api/response';
import { retryWithBackoff } from '@/lib/utils/api-retry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/communities/[id]/posts';

// Validation schemas
const postsQuerySchema = z.object({
  limit: z.string().optional().transform((val) => val ? Math.min(parseInt(val, 10), 100) : 20),
  sort: z.enum(['created', 'trending', 'payout', 'votes']).optional().default('created'),
  before: z.string().optional(),
});

/**
 * GET /api/communities/[id]/posts - Get posts for a community
 * 
 * This route fetches posts from Hive that are tagged with the community's slug.
 * Posts published to a community include the community slug in their tags and metadata.
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

    const { limit, sort, before } = parseResult.data;

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
      sort 
    });

    // Import the content module to fetch posts from Hive
    const { fetchSportsblockPosts } = await import('@/lib/hive-workerbee/content');

    // Fetch posts from Hive that have the community tag
    // Posts published to a community will have the community slug in their tags
    const result = await retryWithBackoff(
      () => fetchSportsblockPosts({
        limit,
        sort,
        tag: community.slug, // Filter by community slug tag
        before,
      }),
      {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    );

    // Additionally filter posts that have sub_community metadata matching this community
    const filteredPosts = result.posts.filter((post) => {
      // Check if post has sub_community metadata
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
        // If metadata parsing fails, just return false
        return false;
      }
    });

    return NextResponse.json({
      success: true,
      posts: filteredPosts,
      community: {
        id: community.id,
        slug: community.slug,
        name: community.name,
      },
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      count: filteredPosts.length,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
