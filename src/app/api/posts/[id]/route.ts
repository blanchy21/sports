import { NextRequest, NextResponse } from 'next/server';
import { FirebasePosts } from '@/lib/firebase/posts';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/posts/[id] - Get a single soft post by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const post = await FirebasePosts.getPostById(id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment view count (fire and forget)
    FirebasePosts.incrementViewCount(id).catch(() => {});

    return NextResponse.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch post'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/posts/[id] - Update a soft post
 *
 * Body:
 * - title: string (optional)
 * - content: string (optional)
 * - tags: string[] (optional)
 * - authorId: string (required for authorization)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Check if post exists
    const existingPost = await FirebasePosts.getPostById(id);
    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Verify author (simple auth check - in production use proper auth)
    if (body.authorId && existingPost.authorId !== body.authorId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to update this post' },
        { status: 403 }
      );
    }

    // Build updates object
    const updates: Partial<{ title: string; content: string; tags: string[] }> = {};

    if (body.title !== undefined) {
      if (body.title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updates.title = body.title.trim();
    }

    if (body.content !== undefined) {
      if (body.content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Content cannot be empty' },
          { status: 400 }
        );
      }
      updates.content = body.content.trim();
    }

    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags) ? body.tags : [];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const updatedPost = await FirebasePosts.updatePost(id, updates);

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update post'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id] - Delete a soft post
 *
 * Query params:
 * - authorId: string (required for authorization)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('authorId');

    // Check if post exists
    const existingPost = await FirebasePosts.getPostById(id);
    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Verify author (simple auth check - in production use proper auth)
    if (authorId && existingPost.authorId !== authorId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this post' },
        { status: 403 }
      );
    }

    await FirebasePosts.deletePost(id);

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete post'
      },
      { status: 500 }
    );
  }
}
