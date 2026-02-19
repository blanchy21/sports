import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { SPORTSBITES_CONFIG } from '@/lib/hive-workerbee/sportsbites';
import { SoftSportsbite } from '@/types/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/sportsbites';
const SOFT_SPORTSBITE_LIMIT = 100;

// ============================================
// Validation Schemas
// ============================================

const getSportsbiteSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(50)),
  before: z.string().optional(),
  author: z.string().min(1).max(50).optional(),
});

const pollSchema = z.object({
  question: z.string().min(1).max(100),
  options: z.tuple([z.string().min(1).max(50), z.string().min(1).max(50)]),
});

const createSportsbiteSchema = z.object({
  body: z.string().min(1).max(SPORTSBITES_CONFIG.MAX_CHARS),
  sportCategory: z.string().optional(),
  images: z.array(z.string().url()).max(4).optional(),
  gifs: z.array(z.string().url()).max(2).optional(),
  matchThreadId: z.string().optional(),
  poll: pollSchema.optional(),
});

const deleteSportsbiteSchema = z.object({
  sportsbiteId: z.string().min(1),
});

// ============================================
// GET /api/soft/sportsbites
// ============================================

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getSportsbiteSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { limit, before, author } = parseResult.data;

    const where: Record<string, unknown> = {
      isDeleted: false,
      matchThreadId: null,
    };

    if (author) {
      where.authorUsername = author;
    }

    // Cursor-based pagination
    let cursor: { id: string } | undefined;
    if (before) {
      // Verify cursor document exists
      const cursorDoc = await prisma.sportsbite.findUnique({ where: { id: before } });
      if (cursorDoc) {
        // Use createdAt-based cursor: fetch items older than the cursor
        where.createdAt = { lt: cursorDoc.createdAt };
      }
    }

    // Fetch one extra to check hasMore
    const rows = await prisma.sportsbite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const sportsbites: SoftSportsbite[] = pageRows.map((row) => ({
      id: row.id,
      authorId: row.authorId,
      authorUsername: row.authorUsername,
      authorDisplayName: row.authorDisplayName || undefined,
      authorAvatar: row.authorAvatar || undefined,
      body: row.body,
      sportCategory: row.sportCategory || undefined,
      images: row.images || [],
      gifs: row.gifs || [],
      poll: (row.poll as SoftSportsbite['poll']) || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      likeCount: row.likeCount || 0,
      commentCount: row.commentCount || 0,
      isDeleted: false,
    }));

    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id : undefined;

    return NextResponse.json(
      {
        success: true,
        sportsbites,
        hasMore,
        nextCursor,
        count: sportsbites.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// POST /api/soft/sportsbites
// ============================================

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const user = await getAuthenticatedUserFromSession(request, { includeProfile: true });
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const body = await request.json();
      const parseResult = createSportsbiteSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { body: biteBody, sportCategory, images, gifs, matchThreadId, poll } = parseResult.data;

      // Rate limiting
      const rateLimit = await checkRateLimit(
        user.userId,
        RATE_LIMITS.softSportsbites,
        'softSportsbites'
      );
      if (!rateLimit.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message:
              'You are posting sportsbites too frequently. Please wait before posting another.',
            retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: createRateLimitHeaders(
              rateLimit.remaining,
              rateLimit.reset,
              RATE_LIMITS.softSportsbites.limit
            ),
          }
        );
      }

      // Check sportsbite limit
      const currentCount = await prisma.sportsbite.count({
        where: { authorId: user.userId, isDeleted: false },
      });

      if (currentCount >= SOFT_SPORTSBITE_LIMIT) {
        return NextResponse.json(
          {
            success: false,
            error: 'Sportsbite limit reached',
            message: `You have reached the maximum of ${SOFT_SPORTSBITE_LIMIT} sportsbites. Upgrade to Hive for unlimited posting and earn rewards!`,
            upgradeRequired: true,
            limitInfo: {
              current: currentCount,
              max: SOFT_SPORTSBITE_LIMIT,
              remaining: 0,
            },
          },
          { status: 403 }
        );
      }

      const now = new Date();

      const newBite = await prisma.sportsbite.create({
        data: {
          authorId: user.userId,
          authorUsername: user.username,
          authorDisplayName: user.displayName || null,
          authorAvatar: user.avatar || null,
          body: biteBody,
          sportCategory: sportCategory || null,
          images: images || [],
          gifs: gifs || [],
          matchThreadId: matchThreadId || null,
          poll: poll || undefined,
          createdAt: now,
          likeCount: 0,
          commentCount: 0,
          isDeleted: false,
        },
      });

      // Update user activity (fire-and-forget)
      prisma.profile
        .update({
          where: { id: user.userId },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});

      const sportsbite: SoftSportsbite = {
        id: newBite.id,
        authorId: user.userId,
        authorUsername: user.username,
        authorDisplayName: user.displayName,
        authorAvatar: user.avatar,
        body: biteBody,
        sportCategory: sportCategory,
        images: images || [],
        gifs: gifs || [],
        createdAt: now,
        updatedAt: now,
        likeCount: 0,
        commentCount: 0,
        isDeleted: false,
      };

      return NextResponse.json({
        success: true,
        sportsbite,
        limitInfo: {
          current: currentCount + 1,
          max: SOFT_SPORTSBITE_LIMIT,
          remaining: SOFT_SPORTSBITE_LIMIT - currentCount - 1,
        },
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// DELETE /api/soft/sportsbites
// ============================================

export async function DELETE(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const user = await getAuthenticatedUserFromSession(request, { includeProfile: true });
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const body = await request.json();
      const parseResult = deleteSportsbiteSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { sportsbiteId } = parseResult.data;

      const doc = await prisma.sportsbite.findUnique({ where: { id: sportsbiteId } });

      if (!doc) {
        return NextResponse.json(
          { success: false, error: 'Sportsbite not found' },
          { status: 404 }
        );
      }

      if (doc.authorId !== user.userId) {
        return NextResponse.json(
          { success: false, error: 'You can only delete your own sportsbites' },
          { status: 403 }
        );
      }

      await prisma.sportsbite.update({
        where: { id: sportsbiteId },
        data: {
          isDeleted: true,
          body: '[deleted]',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Sportsbite deleted',
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
