import { NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/api/response';
import { fetchSportsblockPosts } from '@/lib/hive-workerbee/content';
import { retryWithBackoff } from '@/lib/utils/api-retry';
import type { ApiResponse } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/authors';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
};

const PAGE_SIZE = 20;
const MAX_PAGES = 5; // 5 x 20 = up to 100 posts

export async function GET() {
  const ctx = createRequestContext(ROUTE);
  try {
    const authorMap: Record<
      string,
      {
        username: string;
        posts: number;
        engagement: number;
      }
    > = {};

    // Paginate through posts (Hive nodes cap at ~20 per request)
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await retryWithBackoff(
        () => fetchSportsblockPosts({ limit: PAGE_SIZE, sort: 'created', before: cursor }),
        { maxRetries: 2, initialDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 }
      );

      for (const post of result.posts) {
        const author = post.author;
        if (!author || typeof author !== 'string') continue;

        if (!authorMap[author]) {
          authorMap[author] = { username: author, posts: 0, engagement: 0 };
        }

        authorMap[author].posts += 1;
        // Engagement score: comments x 2 + net_votes (same formula as analytics.ts)
        authorMap[author].engagement += (post.children || 0) * 2 + (post.net_votes || 0);
      }

      if (!result.hasMore || !result.nextCursor) break;
      cursor = result.nextCursor;
    }

    // Sort by engagement descending
    const authors = Object.values(authorMap).sort((a, b) => b.engagement - a.engagement);

    type AuthorInfo = { username: string; posts: number; engagement: number };
    return NextResponse.json<ApiResponse<{ authors: AuthorInfo[] }>>(
      { success: true, authors },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}
