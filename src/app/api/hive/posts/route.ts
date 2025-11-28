import { NextRequest, NextResponse } from 'next/server';
import { fetchSportsblockPosts, getUserPosts } from '@/lib/hive-workerbee/content';
import { retryWithBackoff } from '@/lib/utils/api-retry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const author = searchParams.get('author');
    const permlink = searchParams.get('permlink');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'created';
    const sportCategory = searchParams.get('sportCategory') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const before = searchParams.get('before') || undefined;

    // Fetch a specific post
    if (author && permlink) {
      const { fetchPost } = await import('@/lib/hive-workerbee/content');
      const post = await retryWithBackoff(
        () => fetchPost(author, permlink),
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        }
      );

      return NextResponse.json({
        success: true,
        post: post || null,
      });
    }

    // Fetch user's posts
    if (username) {
      const posts = await retryWithBackoff(
        () => getUserPosts(username, limit),
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        }
      );

      return NextResponse.json({
        success: true,
        posts: posts || [],
        count: posts?.length || 0,
        username,
      });
    }

    // Fetch posts with filters
    const result = await retryWithBackoff(
      () => fetchSportsblockPosts({
        limit,
        sort: sort as 'created' | 'trending' | 'payout' | 'votes',
        sportCategory,
        tag,
        before,
      }),
      {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    );

    return NextResponse.json({
      success: true,
      posts: result.posts || [],
      hasMore: result.hasMore || false,
      nextCursor: result.nextCursor,
      count: result.posts?.length || 0,
    });

  } catch (error) {
    console.error('[API] Error fetching posts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error('[API] Full error details:', {
      message,
      stack,
      error: error instanceof Error ? error : String(error)
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: message,
        // Include more details in development
        ...(process.env.NODE_ENV === 'development' && { details: stack })
      },
      { status: 500 }
    );
  }
}

