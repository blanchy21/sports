import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/poll-votes';

// ============================================
// Helpers
// ============================================

type PollResults = { option0Count: number; option1Count: number; totalVotes: number };

async function getPollResults(sportsbiteId: string): Promise<PollResults> {
  const voteCounts = await prisma.pollVote.groupBy({
    by: ['option'],
    where: { sportsbiteId },
    _count: true,
  });
  const results: PollResults = { option0Count: 0, option1Count: 0, totalVotes: 0 };
  for (const v of voteCounts) {
    if (v.option === 0) results.option0Count = v._count;
    else results.option1Count = v._count;
    results.totalVotes += v._count;
  }
  return results;
}

// ============================================
// Validation
// ============================================

const getPollResultsSchema = z.object({
  sportsbiteId: z.string().min(1),
});

const castVoteSchema = z.object({
  sportsbiteId: z.string().min(1),
  option: z.union([z.literal(0), z.literal(1)]),
});

const batchCheckSchema = z.object({
  sportsbiteIds: z.array(z.string().min(1)).min(1).max(50),
});

// ============================================
// GET /api/soft/poll-votes - Get poll results and user's vote
// ============================================

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = getPollResultsSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return validationError(parseResult.error, ctx.requestId);
    }

    const { sportsbiteId } = parseResult.data;

    const [results, user] = await Promise.all([
      getPollResults(sportsbiteId),
      getAuthenticatedUserFromSession(request),
    ]);

    let userVote: 0 | 1 | null = null;
    let hasVoted = false;
    if (user) {
      const existing = await prisma.pollVote.findUnique({
        where: { userId_sportsbiteId: { userId: user.userId, sportsbiteId } },
      });
      if (existing) {
        hasVoted = true;
        userVote = existing.option as 0 | 1;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      userVote,
      hasVoted,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}

// ============================================
// POST /api/soft/poll-votes - Cast or change vote
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
      const parseResult = castVoteSchema.safeParse(body);

      if (!parseResult.success) {
        return validationError(parseResult.error, ctx.requestId);
      }

      const { sportsbiteId, option } = parseResult.data;

      // Rate limiting
      const rateLimit = await checkRateLimit(
        user.userId,
        RATE_LIMITS.softPollVotes,
        'softPollVotes'
      );
      if (!rateLimit.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            message: 'You are voting too frequently. Please slow down.',
            retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: createRateLimitHeaders(
              rateLimit.remaining,
              rateLimit.reset,
              RATE_LIMITS.softPollVotes.limit
            ),
          }
        );
      }

      const existing = await prisma.pollVote.findUnique({
        where: { userId_sportsbiteId: { userId: user.userId, sportsbiteId } },
      });
      const existingOption: 0 | 1 | null = existing ? (existing.option as 0 | 1) : null;

      if (existingOption === option) {
        // Already voted for this option — no change
        const results = await getPollResults(sportsbiteId);
        return NextResponse.json({
          success: true,
          action: 'unchanged',
          userVote: option,
          results,
        });
      } else if (existingOption !== null) {
        // Changing vote — update option
        await prisma.pollVote.update({
          where: { id: existing!.id },
          data: { option, createdAt: new Date() },
        });
      } else {
        // New vote
        await prisma.pollVote.create({
          data: {
            userId: user.userId,
            sportsbiteId,
            option,
            createdAt: new Date(),
          },
        });
      }

      // Fetch updated results via aggregation
      const results = await getPollResults(sportsbiteId);

      return NextResponse.json({
        success: true,
        action: existingOption !== null ? 'changed' : 'voted',
        userVote: option,
        results,
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// PATCH /api/soft/poll-votes - Batch check for multiple sportsbite IDs
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

    // Batch query: all vote counts grouped by sportsbiteId + option
    const allCounts = await prisma.pollVote.groupBy({
      by: ['sportsbiteId', 'option'],
      where: { sportsbiteId: { in: sportsbiteIds } },
      _count: true,
    });

    // Batch query: user's votes for all requested IDs
    const userVotes = user
      ? await prisma.pollVote.findMany({
          where: { userId: user.userId, sportsbiteId: { in: sportsbiteIds } },
          select: { sportsbiteId: true, option: true },
        })
      : [];

    // Build lookup map
    const userVoteMap = new Map(userVotes.map((v) => [v.sportsbiteId, v.option as 0 | 1]));

    // Aggregate into response shape
    const results: Record<
      string,
      { results: PollResults; userVote: 0 | 1 | null; hasVoted: boolean }
    > = {};

    for (const id of sportsbiteIds) {
      const vote = userVoteMap.get(id);
      results[id] = {
        results: { option0Count: 0, option1Count: 0, totalVotes: 0 },
        userVote: vote ?? null,
        hasVoted: vote !== undefined,
      };
    }

    for (const row of allCounts) {
      const entry = results[row.sportsbiteId];
      if (entry) {
        if (row.option === 0) entry.results.option0Count = row._count;
        else entry.results.option1Count = row._count;
        entry.results.totalVotes += row._count;
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
