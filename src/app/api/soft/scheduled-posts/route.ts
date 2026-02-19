import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { withCsrfProtection } from '@/lib/api/csrf';

const createScheduledPostSchema = z.object({
  userId: z.string().min(1),
  postData: z.object({
    authorId: z.string().min(1),
    authorUsername: z.string().min(1),
    authorDisplayName: z.string().optional(),
    authorAvatar: z.string().optional(),
    title: z.string().min(1),
    content: z.string().min(1),
    tags: z.array(z.string()).optional().default([]),
    sportCategory: z.string().optional(),
    featuredImage: z.string().optional(),
    communityId: z.string().optional(),
    communitySlug: z.string().optional(),
    communityName: z.string().optional(),
  }),
  scheduledAt: z.string().transform((val) => new Date(val)),
});

/**
 * POST /api/soft/scheduled-posts - Create a scheduled post
 */
export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    try {
      const sessionUser = await getAuthenticatedUserFromSession(request);
      if (!sessionUser) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const body = await request.json();
      const parseResult = createScheduledPostSchema.safeParse(body);

      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: parseResult.error.flatten() },
          { status: 400 }
        );
      }

      const { userId, postData, scheduledAt } = parseResult.data;

      if (sessionUser.userId !== userId) {
        return NextResponse.json(
          { success: false, error: 'Cannot create scheduled posts as another user' },
          { status: 403 }
        );
      }

      const scheduledPost = await prisma.scheduledPost.create({
        data: {
          userId,
          postData: postData as unknown as Prisma.InputJsonValue,
          scheduledAt,
          status: 'pending',
        },
      });

      return NextResponse.json(
        {
          success: true,
          scheduledPost: {
            id: scheduledPost.id,
            userId: scheduledPost.userId,
            postData,
            scheduledAt: scheduledPost.scheduledAt,
            status: scheduledPost.status,
            createdAt: scheduledPost.createdAt,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating scheduled post:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create scheduled post' },
        { status: 500 }
      );
    }
  });
}
