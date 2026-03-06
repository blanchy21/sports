import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { csrfProtected } from '@/lib/api/csrf';
import { createApiHandler } from '@/lib/api/response';

const ROUTE = '/api/soft/scheduled-posts/[id]';

function extractId(request: Request): string {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  // Expected: ['', 'api', 'soft', 'scheduled-posts', '{id}']
  return segments[4];
}

/**
 * DELETE /api/soft/scheduled-posts/[id] — Cancel a pending scheduled post
 */
export const DELETE = csrfProtected(
  createApiHandler(ROUTE, async (request) => {
    const sessionUser = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const id = extractId(request);
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing scheduled post ID' },
        { status: 400 }
      );
    }

    const post = await prisma.scheduledPost.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Scheduled post not found' },
        { status: 404 }
      );
    }

    if (post.userId !== sessionUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to cancel this post' },
        { status: 403 }
      );
    }

    if (post.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot cancel a post with status "${post.status}"` },
        { status: 400 }
      );
    }

    await prisma.scheduledPost.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true });
  })
);
