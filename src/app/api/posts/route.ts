import { NextRequest, NextResponse } from 'next/server';
import { FirebasePosts, CreateSoftPostInput } from '@/lib/firebase/posts';

/**
 * GET /api/posts - Fetch soft posts (non-Hive posts stored in Firebase)
 *
 * Query params:
 * - limit: number (default 20)
 * - authorId: string (filter by author)
 * - communityId: string (filter by community)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const authorId = searchParams.get('authorId');
    const communityId = searchParams.get('communityId');

    let posts;

    if (authorId) {
      posts = await FirebasePosts.getPostsByAuthor(authorId);
    } else if (communityId) {
      posts = await FirebasePosts.getPostsByCommunity(communityId, limit);
    } else {
      posts = await FirebasePosts.getAllPosts(limit);
    }

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length
    });
  } catch (error) {
    console.error('Error fetching soft posts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts - Create a new soft post (for non-Hive users)
 *
 * Body:
 * - authorId: string (required)
 * - authorUsername: string (required)
 * - authorDisplayName: string (optional)
 * - authorAvatar: string (optional)
 * - title: string (required)
 * - content: string (required)
 * - tags: string[] (optional)
 * - sportCategory: string (optional)
 * - featuredImage: string (optional)
 * - communityId: string (optional)
 * - communitySlug: string (optional)
 * - communityName: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.authorId || !body.authorUsername) {
      return NextResponse.json(
        { success: false, error: 'Author ID and username are required' },
        { status: 400 }
      );
    }

    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Validate title length
    if (body.title.length > 255) {
      return NextResponse.json(
        { success: false, error: 'Title must be 255 characters or less' },
        { status: 400 }
      );
    }

    const input: CreateSoftPostInput = {
      authorId: body.authorId,
      authorUsername: body.authorUsername,
      authorDisplayName: body.authorDisplayName,
      authorAvatar: body.authorAvatar,
      title: body.title.trim(),
      content: body.content.trim(),
      tags: Array.isArray(body.tags) ? body.tags : [],
      sportCategory: body.sportCategory,
      featuredImage: body.featuredImage,
      communityId: body.communityId,
      communitySlug: body.communitySlug,
      communityName: body.communityName
    };

    const post = await FirebasePosts.createPost(input);

    return NextResponse.json({
      success: true,
      post,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating soft post:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create post'
      },
      { status: 500 }
    );
  }
}
