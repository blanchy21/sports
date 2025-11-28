import { NextRequest, NextResponse } from 'next/server';
import { fetchComments } from '@/lib/hive-workerbee/content';
import { getUserComments } from '@/lib/hive-workerbee/comments';
import { retryWithBackoff } from '@/lib/utils/api-retry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const author = searchParams.get('author');
    const permlink = searchParams.get('permlink');
    const username = searchParams.get('username');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch comments for a specific post
    if (author && permlink) {
      const comments = await retryWithBackoff(
        () => fetchComments(author, permlink),
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        }
      );

      return NextResponse.json({
        success: true,
        comments: comments || [],
        count: comments?.length || 0,
      });
    }

    // Fetch user's comments
    if (username) {
      const comments = await retryWithBackoff(
        () => getUserComments(username, limit),
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        }
      );

      return NextResponse.json({
        success: true,
        comments: comments || [],
        count: comments?.length || 0,
        username,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Either author/permlink or username is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[API] Error fetching comments:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

