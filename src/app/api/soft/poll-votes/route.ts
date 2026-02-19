import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { createRequestContext, validationError, unauthorizedError } from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/utils/rate-limit';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTE = '/api/soft/poll-votes';

// ============================================
// Helpers
// ============================================

function encodeSportsbiteId(id: string): string {
  return id.replace(/\//g, '__');
}

function createVoteDocId(userId: string, sportsbiteId: string): string {
  return `${userId}__${encodeSportsbiteId(sportsbiteId)}`;
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
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const encodedId = encodeSportsbiteId(sportsbiteId);

    const [resultsDoc, user] = await Promise.all([
      db.collection('poll_results').doc(encodedId).get(),
      getAuthenticatedUserFromSession(request),
    ]);

    const results = resultsDoc.exists
      ? resultsDoc.data()
      : { option0Count: 0, option1Count: 0, totalVotes: 0 };

    let userVote: 0 | 1 | null = null;
    let hasVoted = false;
    if (user) {
      const voteDocId = createVoteDocId(user.userId, sportsbiteId);
      const voteDoc = await db.collection('poll_votes').doc(voteDocId).get();
      if (voteDoc.exists) {
        hasVoted = true;
        userVote = voteDoc.data()?.option ?? null;
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        option0Count: results?.option0Count || 0,
        option1Count: results?.option1Count || 0,
        totalVotes: results?.totalVotes || 0,
      },
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

      const voteDocId = createVoteDocId(user.userId, sportsbiteId);
      const voteRef = db.collection('poll_votes').doc(voteDocId);
      const encodedId = encodeSportsbiteId(sportsbiteId);
      const resultsRef = db.collection('poll_results').doc(encodedId);

      const existingDoc = await voteRef.get();
      const existingOption: 0 | 1 | null = existingDoc.exists
        ? (existingDoc.data()?.option ?? null)
        : null;

      const optionKey = (opt: 0 | 1) => (opt === 0 ? 'option0Count' : 'option1Count');

      if (existingOption === option) {
        // Already voted for this option — no change
        const resultsDoc = await resultsRef.get();
        const results = resultsDoc.exists ? resultsDoc.data() : {};
        return NextResponse.json({
          success: true,
          action: 'unchanged',
          userVote: option,
          results: {
            option0Count: results?.option0Count || 0,
            option1Count: results?.option1Count || 0,
            totalVotes: results?.totalVotes || 0,
          },
        });
      } else if (existingOption !== null) {
        // Changing vote — swap counts
        await Promise.all([
          voteRef.update({ option, createdAt: new Date() }),
          resultsRef.set(
            {
              [optionKey(existingOption)]: FieldValue.increment(-1),
              [optionKey(option)]: FieldValue.increment(1),
            },
            { merge: true }
          ),
        ]);
      } else {
        // New vote
        await Promise.all([
          voteRef.set({
            userId: user.userId,
            sportsbiteId,
            option,
            createdAt: new Date(),
          }),
          resultsRef.set(
            {
              [optionKey(option)]: FieldValue.increment(1),
              totalVotes: FieldValue.increment(1),
            },
            { merge: true }
          ),
        ]);
      }

      // Fetch updated results
      const updatedDoc = await resultsRef.get();
      const updatedResults = updatedDoc.exists ? updatedDoc.data() : {};

      return NextResponse.json({
        success: true,
        action: existingOption !== null ? 'changed' : 'voted',
        userVote: option,
        results: {
          option0Count: updatedResults?.option0Count || 0,
          option1Count: updatedResults?.option1Count || 0,
          totalVotes: updatedResults?.totalVotes || 0,
        },
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}

// ============================================
// PUT /api/soft/poll-votes - Batch check for multiple sportsbite IDs
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
        results: { option0Count: number; option1Count: number; totalVotes: number };
        userVote: 0 | 1 | null;
        hasVoted: boolean;
      }
    > = {};

    await Promise.all(
      sportsbiteIds.map(async (sportsbiteId) => {
        const encodedId = encodeSportsbiteId(sportsbiteId);
        const resultsDoc = await db.collection('poll_results').doc(encodedId).get();
        const data = resultsDoc.exists ? resultsDoc.data() : {};

        let userVote: 0 | 1 | null = null;
        let hasVoted = false;
        if (user) {
          const voteDocId = createVoteDocId(user.userId, sportsbiteId);
          const voteDoc = await db.collection('poll_votes').doc(voteDocId).get();
          if (voteDoc.exists) {
            hasVoted = true;
            userVote = voteDoc.data()?.option ?? null;
          }
        }

        results[sportsbiteId] = {
          results: {
            option0Count: data?.option0Count || 0,
            option1Count: data?.option1Count || 0,
            totalVotes: data?.totalVotes || 0,
          },
          userVote,
          hasVoted,
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
