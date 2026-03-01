import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { getHiveAvatarUrl } from '@/lib/utils/avatar';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/predictions/[id]/comments';

// ============================================
// Validation
// ============================================

const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(280, 'Comment cannot exceed 280 characters'),
  parentCommentId: z.string().optional(),
});

// ============================================
// Helpers
// ============================================

/** Extract predictionId from the URL path: /api/predictions/{id}/comments */
function extractPredictionId(request: NextRequest): string | null {
  const segments = request.nextUrl.pathname.split('/');
  // Expected: ['', 'api', 'predictions', '{id}', 'comments']
  const predIdx = segments.indexOf('predictions');
  if (predIdx >= 0 && predIdx + 1 < segments.length) {
    return segments[predIdx + 1];
  }
  return null;
}

// ============================================
// GET /api/predictions/[id]/comments
// ============================================

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const predictionId = extractPredictionId(request);
    if (!predictionId) {
      return NextResponse.json({ success: false, error: 'Missing prediction ID' }, { status: 400 });
    }

    const rows = await prisma.predictionComment.findMany({
      where: { predictionId },
      orderBy: { createdAt: 'asc' },
    });

    const comments = rows.map((row) => ({
      id: row.id,
      predictionId: row.predictionId,
      username: row.username,
      displayName: row.displayName,
      avatar: row.avatar,
      parentCommentId: row.parentCommentId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { success: true, comments, count: comments.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// POST /api/predictions/[id]/comments
// ============================================

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const predictionId = extractPredictionId(request);
      if (!predictionId) {
        return NextResponse.json(
          { success: false, error: 'Missing prediction ID' },
          { status: 400 }
        );
      }

      const user = await getAuthenticatedUserFromSession(request, { includeProfile: true });
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const body = await request.json();
      const parseResult = createCommentSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { body: commentBody, parentCommentId } = parseResult.data;

      // Rate limiting
      const rateLimit = await checkRateLimit(
        user.userId,
        RATE_LIMITS.softComments,
        'predictionComments'
      );
      if (!rateLimit.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message:
              'You are commenting too frequently. Please wait before posting another comment.',
            retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: createRateLimitHeaders(
              rateLimit.remaining,
              rateLimit.reset,
              RATE_LIMITS.softComments.limit
            ),
          }
        );
      }

      // Resolve avatar: use profile avatar or fall back to Hive avatar
      const avatar = user.avatar || getHiveAvatarUrl(user.username);

      const newComment = await prisma.predictionComment.create({
        data: {
          predictionId,
          username: user.username,
          displayName: user.displayName || null,
          avatar,
          parentCommentId: parentCommentId || null,
          body: commentBody,
        },
      });

      // Increment commentCount on the prediction non-blocking
      after(
        prisma.prediction
          .update({
            where: { id: predictionId },
            data: { commentCount: { increment: 1 } },
          })
          .catch((err: unknown) =>
            logger.error('Failed to increment prediction comment count', ROUTE, err)
          )
      );

      const comment = {
        id: newComment.id,
        predictionId: newComment.predictionId,
        username: newComment.username,
        displayName: newComment.displayName,
        avatar: newComment.avatar,
        parentCommentId: newComment.parentCommentId,
        body: newComment.body,
        createdAt: newComment.createdAt.toISOString(),
      };

      return NextResponse.json({ success: true, comment });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
