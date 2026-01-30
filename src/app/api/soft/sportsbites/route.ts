import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { updateUserLastActiveAt } from '@/lib/firebase/profiles';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/api/rate-limit';
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

const createSportsbiteSchema = z.object({
  body: z.string().min(1).max(SPORTSBITES_CONFIG.MAX_CHARS),
  sportCategory: z.string().optional(),
  images: z.array(z.string().url()).max(4).optional(),
  gifs: z.array(z.string().url()).max(2).optional(),
});

const deleteSportsbiteSchema = z.object({
  sportsbiteId: z.string().min(1),
});

// ============================================
// Helper Functions
// ============================================

async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ userId: string; username: string; displayName?: string; avatar?: string } | null> {
  const userId = request.headers.get('x-user-id');
  if (!userId) return null;

  try {
    const db = getAdminDb();
    if (!db) return null;

    const profileDoc = await db.collection('profiles').doc(userId).get();
    if (!profileDoc.exists) return null;

    const data = profileDoc.data();
    return {
      userId: profileDoc.id,
      username: data?.username ?? '',
      displayName: data?.displayName,
      avatar: data?.avatarUrl,
    };
  } catch {
    return null;
  }
}

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

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    let query = db
      .collection('soft_sportsbites')
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc');

    if (author) {
      query = query.where('authorUsername', '==', author);
    }

    // Cursor-based pagination: fetch one extra to check hasMore
    query = query.limit(limit + 1);

    if (before) {
      // Fetch the cursor document to get its createdAt
      const cursorDoc = await db.collection('soft_sportsbites').doc(before).get();
      if (cursorDoc.exists) {
        query = db
          .collection('soft_sportsbites')
          .where('isDeleted', '==', false)
          .orderBy('createdAt', 'desc');
        if (author) {
          query = query.where('authorUsername', '==', author);
        }
        query = query.startAfter(cursorDoc.data()?.createdAt).limit(limit + 1);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const pageDocs = hasMore ? docs.slice(0, limit) : docs;

    const sportsbites: SoftSportsbite[] = pageDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        authorDisplayName: data.authorDisplayName,
        authorAvatar: data.authorAvatar,
        body: data.body,
        sportCategory: data.sportCategory,
        images: data.images || [],
        gifs: data.gifs || [],
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        likeCount: data.likeCount || 0,
        commentCount: data.commentCount || 0,
        isDeleted: false,
      };
    });

    const nextCursor = hasMore ? pageDocs[pageDocs.length - 1]?.id : undefined;

    return NextResponse.json({
      success: true,
      sportsbites,
      hasMore,
      nextCursor,
      count: sportsbites.length,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// POST /api/soft/sportsbites
// ============================================

export async function POST(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedError('Authentication required', ctx.requestId);
    }

    const body = await request.json();
    const parseResult = createSportsbiteSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { body: biteBody, sportCategory, images, gifs } = parseResult.data;

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(user.userId, RATE_LIMITS.sportsbites);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message:
            'You are posting sportsbites too frequently. Please wait before posting another.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    // Check sportsbite limit
    const userCount = await db
      .collection('soft_sportsbites')
      .where('authorId', '==', user.userId)
      .where('isDeleted', '==', false)
      .count()
      .get();

    const currentCount = userCount.data().count;
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
    const sportsbiteData = {
      authorId: user.userId,
      authorUsername: user.username,
      authorDisplayName: user.displayName || null,
      authorAvatar: user.avatar || null,
      body: biteBody,
      sportCategory: sportCategory || null,
      images: images || [],
      gifs: gifs || [],
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      commentCount: 0,
      isDeleted: false,
    };

    const docRef = await db.collection('soft_sportsbites').add(sportsbiteData);

    // Update user activity
    await updateUserLastActiveAt(user.userId);

    const sportsbite: SoftSportsbite = {
      id: docRef.id,
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
}

// ============================================
// DELETE /api/soft/sportsbites
// ============================================

export async function DELETE(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedError('Authentication required', ctx.requestId);
    }

    const body = await request.json();
    const parseResult = deleteSportsbiteSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { sportsbiteId } = parseResult.data;

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const docRef = db.collection('soft_sportsbites').doc(sportsbiteId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Sportsbite not found' }, { status: 404 });
    }

    const data = doc.data();
    if (data?.authorId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own sportsbites' },
        { status: 403 }
      );
    }

    await docRef.update({
      isDeleted: true,
      body: '[deleted]',
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Sportsbite deleted',
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
