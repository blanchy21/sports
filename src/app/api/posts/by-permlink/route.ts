import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/response';
import { logger } from '@/lib/logger';

const ROUTE = '/api/posts/by-permlink';

/**
 * GET /api/posts/by-permlink?permlink=xxx - Get a soft post by its permlink
 *
 * This is useful for URL-based routing where we use permlink in the URL
 */
export const GET = createApiHandler(ROUTE, async (request) => {
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
    .catch((err: unknown) => {
      logger.error('Failed to increment view count', 'posts-by-permlink', err);
    });

  return NextResponse.json(
    {
      success: true,
      post,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
});
