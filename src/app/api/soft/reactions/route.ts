import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import type { ReactionEmoji } from '@/lib/hive-workerbee/sportsbites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/reactions';

// ============================================
// Helpers
// ============================================

type ReactionCounts = {
  fire: number;
  shocked: number;
  laughing: number;
  angry: number;
  eyes: number;
  thumbs_down: number;
  total: number;
};

const DEFAULT_COUNTS: ReactionCounts = {
  fire: 0,
  shocked: 0,
  laughing: 0,
  angry: 0,
  eyes: 0,
  thumbs_down: 0,
  total: 0,
};

async function getReactionCounts(sportsbiteId: string): Promise<ReactionCounts> {
  const reactionCounts = await prisma.reaction.groupBy({
    by: ['emoji'],
    where: { sportsbiteId },
    _count: true,
  });
  const counts: ReactionCounts = { ...DEFAULT_COUNTS };
  for (const r of reactionCounts) {
    if (r.emoji in counts && r.emoji !== 'total') {
      counts[r.emoji as keyof Omit<ReactionCounts, 'total'>] = r._count;
    }
    counts.total += r._count;
  }
  return counts;
}

// ============================================
// Validation
// ============================================

const getReactionsSchema = z.object({
  sportsbiteId: z.string().min(1),
});

const toggleReactionSchema = z.object({
  sportsbiteId: z.string().min(1),
  emoji: z.enum(['fire', 'shocked', 'laughing', 'angry', 'eyes', 'thumbs_down']),
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

    // Fetch counts and user auth in parallel
    const [counts, user] = await Promise.all([
      getReactionCounts(sportsbiteId),
      getAuthenticatedUserFromSession(request),
    ]);

    // Check user's existing reaction
    let userReaction: ReactionEmoji | null = null;
    if (user) {
      const existing = await prisma.reaction.findUnique({
        where: { userId_sportsbiteId: { userId: user.userId, sportsbiteId } },
      });
      if (existing) {
        userReaction = existing.emoji as ReactionEmoji;
      }
    }

    return NextResponse.json({
      success: true,
      counts,
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

      const existing = await prisma.reaction.findUnique({
        where: { userId_sportsbiteId: { userId: user.userId, sportsbiteId } },
      });
      const existingEmoji: ReactionEmoji | null = existing
        ? (existing.emoji as ReactionEmoji)
        : null;

      let action: 'added' | 'removed' | 'swapped';

      if (existingEmoji === emoji) {
        // Same emoji — remove reaction
        await prisma.reaction.delete({ where: { id: existing!.id } });
        action = 'removed';
      } else if (existingEmoji) {
        // Different emoji — swap reaction
        await prisma.reaction.update({
          where: { id: existing!.id },
          data: { emoji, createdAt: new Date() },
        });
        action = 'swapped';
      } else {
        // No existing — add reaction
        await prisma.reaction.create({
          data: {
            userId: user.userId,
            sportsbiteId,
            emoji,
            createdAt: new Date(),
          },
        });
        action = 'added';
      }

      // Fetch updated counts via aggregation
      const counts = await getReactionCounts(sportsbiteId);

      return NextResponse.json({
        success: true,
        action,
        userReaction: action === 'removed' ? null : emoji,
        counts,
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// PATCH /api/soft/reactions - Batch check for multiple sportsbite IDs
// ============================================

export async function PATCH(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const body = await request.json();
    const parseResult = batchCheckSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { sportsbiteIds } = parseResult.data;
    const user = await getAuthenticatedUserFromSession(request);

    // Batch query: all reaction counts grouped by sportsbiteId + emoji
    const allCounts = await prisma.reaction.groupBy({
      by: ['sportsbiteId', 'emoji'],
      where: { sportsbiteId: { in: sportsbiteIds } },
      _count: true,
    });

    // Batch query: user's reactions for all requested IDs
    const userReactions = user
      ? await prisma.reaction.findMany({
          where: { userId: user.userId, sportsbiteId: { in: sportsbiteIds } },
          select: { sportsbiteId: true, emoji: true },
        })
      : [];

    // Build lookup maps
    const userReactionMap = new Map(userReactions.map((r) => [r.sportsbiteId, r.emoji]));

    // Aggregate into response shape
    const results: Record<string, { counts: ReactionCounts; userReaction: ReactionEmoji | null }> =
      {};

    for (const id of sportsbiteIds) {
      results[id] = {
        counts: { ...DEFAULT_COUNTS },
        userReaction: (userReactionMap.get(id) as ReactionEmoji) ?? null,
      };
    }

    for (const row of allCounts) {
      const entry = results[row.sportsbiteId];
      if (entry && row.emoji in entry.counts && row.emoji !== 'total') {
        entry.counts[row.emoji as keyof Omit<ReactionCounts, 'total'>] = row._count;
      }
      if (entry) {
        entry.counts.total += row._count;
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
