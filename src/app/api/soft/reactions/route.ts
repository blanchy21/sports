import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { ReactionEmoji } from '@/lib/hive-workerbee/sportsbites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/reactions';

// ============================================
// Helpers
// ============================================

/** Encode sportsbite ID for use as Firestore doc ID (replace `/` with `__`) */
function encodeSportsbiteId(id: string): string {
  return id.replace(/\//g, '__');
}

function createReactionDocId(userId: string, sportsbiteId: string): string {
  return `${userId}__${encodeSportsbiteId(sportsbiteId)}`;
}

// ============================================
// Validation
// ============================================

const getReactionsSchema = z.object({
  sportsbiteId: z.string().min(1),
});

const toggleReactionSchema = z.object({
  sportsbiteId: z.string().min(1),
  emoji: z.enum(['fire', 'shocked', 'laughing', 'angry']),
});

const batchCheckSchema = z.object({
  sportsbiteIds: z.array(z.string().min(1)).min(1).max(50),
});

// ============================================
// GET /api/soft/reactions - Get reaction counts and user's reaction
// ============================================

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getReactionsSchema.safeParse(searchParams);

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

    const encodedId = encodeSportsbiteId(sportsbiteId);

    // Fetch counts and user auth in parallel
    const [countsDoc, user] = await Promise.all([
      db.collection('sportsbite_reaction_counts').doc(encodedId).get(),
      getAuthenticatedUserFromSession(request),
    ]);

    const counts = countsDoc.exists
      ? countsDoc.data()
      : { fire: 0, shocked: 0, laughing: 0, angry: 0, total: 0 };

    // Check user's existing reaction
    let userReaction: ReactionEmoji | null = null;
    if (user) {
      const reactionDocId = createReactionDocId(user.userId, sportsbiteId);
      const reactionDoc = await db.collection('sportsbite_reactions').doc(reactionDocId).get();
      if (reactionDoc.exists) {
        userReaction = reactionDoc.data()?.emoji || null;
      }
    }

    return NextResponse.json({
      success: true,
      counts: {
        fire: counts?.fire || 0,
        shocked: counts?.shocked || 0,
        laughing: counts?.laughing || 0,
        angry: counts?.angry || 0,
        total: counts?.total || 0,
      },
      userReaction,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// POST /api/soft/reactions - Toggle/swap/remove reaction
// ============================================

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    try {
      const user = await getAuthenticatedUserFromSession(request);
      if (!user) {
        return unauthorizedError('Authentication required', ctx.requestId);
      }

      const body = await request.json();
      const parseResult = toggleReactionSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { sportsbiteId, emoji } = parseResult.data;
      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Database not configured' },
          { status: 500 }
        );
      }

      // Rate limiting
      const rateLimit = await checkRateLimit(
        user.userId,
        RATE_LIMITS.softReactions,
        'softReactions'
      );
      if (!rateLimit.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'You are reacting too frequently. Please slow down.',
            retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: createRateLimitHeaders(
              rateLimit.remaining,
              rateLimit.reset,
              RATE_LIMITS.softReactions.limit
            ),
          }
        );
      }

      const reactionDocId = createReactionDocId(user.userId, sportsbiteId);
      const reactionRef = db.collection('sportsbite_reactions').doc(reactionDocId);
      const encodedId = encodeSportsbiteId(sportsbiteId);
      const countsRef = db.collection('sportsbite_reaction_counts').doc(encodedId);

      const existingDoc = await reactionRef.get();
      const existingEmoji: ReactionEmoji | null = existingDoc.exists
        ? existingDoc.data()?.emoji || null
        : null;

      let action: 'added' | 'removed' | 'swapped';

      if (existingEmoji === emoji) {
        // Same emoji — remove reaction
        await Promise.all([
          reactionRef.delete(),
          countsRef.set(
            { [emoji]: FieldValue.increment(-1), total: FieldValue.increment(-1) },
            { merge: true }
          ),
        ]);
        action = 'removed';
      } else if (existingEmoji) {
        // Different emoji — swap reaction
        await Promise.all([
          reactionRef.update({ emoji, createdAt: new Date() }),
          countsRef.set(
            {
              [existingEmoji]: FieldValue.increment(-1),
              [emoji]: FieldValue.increment(1),
            },
            { merge: true }
          ),
        ]);
        action = 'swapped';
      } else {
        // No existing — add reaction
        await Promise.all([
          reactionRef.set({
            userId: user.userId,
            sportsbiteId,
            emoji,
            createdAt: new Date(),
          }),
          countsRef.set(
            { [emoji]: FieldValue.increment(1), total: FieldValue.increment(1) },
            { merge: true }
          ),
        ]);
        action = 'added';
      }

      // Fetch updated counts
      const updatedCountsDoc = await countsRef.get();
      const updatedCounts = updatedCountsDoc.exists ? updatedCountsDoc.data() : {};

      return NextResponse.json({
        success: true,
        action,
        userReaction: action === 'removed' ? null : emoji,
        counts: {
          fire: updatedCounts?.fire || 0,
          shocked: updatedCounts?.shocked || 0,
          laughing: updatedCounts?.laughing || 0,
          angry: updatedCounts?.angry || 0,
          total: updatedCounts?.total || 0,
        },
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// PUT /api/soft/reactions - Batch check for multiple sportsbite IDs
// ============================================

export async function PUT(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const body = await request.json();
    const parseResult = batchCheckSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { sportsbiteIds } = parseResult.data;
    const user = await getAuthenticatedUserFromSession(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const results: Record<
      string,
      {
        counts: { fire: number; shocked: number; laughing: number; angry: number; total: number };
        userReaction: ReactionEmoji | null;
      }
    > = {};

    await Promise.all(
      sportsbiteIds.map(async (sportsbiteId) => {
        const encodedId = encodeSportsbiteId(sportsbiteId);

        const countsDoc = await db.collection('sportsbite_reaction_counts').doc(encodedId).get();

        const counts = countsDoc.exists ? countsDoc.data() : {};

        let userReaction: ReactionEmoji | null = null;
        if (user) {
          const reactionDocId = createReactionDocId(user.userId, sportsbiteId);
          const reactionDoc = await db.collection('sportsbite_reactions').doc(reactionDocId).get();
          if (reactionDoc.exists) {
            userReaction = reactionDoc.data()?.emoji || null;
          }
        }

        results[sportsbiteId] = {
          counts: {
            fire: counts?.fire || 0,
            shocked: counts?.shocked || 0,
            laughing: counts?.laughing || 0,
            angry: counts?.angry || 0,
            total: counts?.total || 0,
          },
          userReaction,
        };
      })
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
