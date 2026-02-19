import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/posts/by-permlink?permlink=xxx - Get a soft post by its permlink
 *
 * This is useful for URL-based routing where we use permlink in the URL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const permlink = searchParams.get('permlink');

    if (!permlink) {
      return NextResponse.json({ success: false, error: 'Permlink is required' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { permlink } });

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Increment view count (fire and forget, but log errors)
    prisma.post
      .update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err) => {
        console.error('Failed to increment view count:', err instanceof Error ? err.message : err);
      });

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error('Error fetching post by permlink:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch post',
      },
      { status: 500 }
    );
  }
}
