/**
 * Leaderboard API Route
 *
 * Returns weekly leaderboards for content rewards.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getLeaderboards,
  getCategoryLeaderboard,
  generateWeeklyLeaderboards,
  getCurrentWeekId,
} from '@/lib/metrics/leaderboard';
import type { RewardCategory } from '@/lib/metrics/types';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitHeaders,
} from '@/lib/utils/rate-limit';
import { createRequestContext } from '@/lib/api/response';

const ROUTE = '/api/metrics/leaderboard';

/**
 * GET /api/metrics/leaderboard
 *
 * Query params:
 * - weekId: specific week (default: current week)
 * - category: specific category (returns all if not specified)
 * - limit: max entries per category (default: 10)
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(clientId, RATE_LIMITS.read, 'read');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429, headers: createRateLimitHeaders(0, rateLimit.reset, RATE_LIMITS.read.limit) }
    );
  }

  const ctx = createRequestContext(ROUTE);
  try {
    const { searchParams } = new URL(request.url);
    const weekId = searchParams.get('weekId') || getCurrentWeekId();
    const category = searchParams.get('category') as RewardCategory | null;
    const parsedLimit = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? 10 : parsedLimit, 1), 100);

    // If specific category requested
    if (category) {
      const entries = await getCategoryLeaderboard(category, weekId, limit);

      return NextResponse.json({
        success: true,
        weekId,
        category,
        entries,
      });
    }

    // Get all leaderboards
    let leaderboards = await getLeaderboards(weekId);

    // If no leaderboards exist for current week, generate them
    if (!leaderboards && weekId === getCurrentWeekId()) {
      leaderboards = await generateWeeklyLeaderboards(weekId);
    }

    if (!leaderboards) {
      return NextResponse.json({
        success: true,
        weekId,
        leaderboards: null,
        message: 'No leaderboard data available for this week',
      });
    }

    // Apply limit to each category
    const limitedLeaderboards = Object.fromEntries(
      Object.entries(leaderboards.leaderboards).map(([cat, entries]) => [
        cat,
        entries.slice(0, limit),
      ])
    );

    return NextResponse.json({
      success: true,
      weekId,
      generatedAt: leaderboards.generatedAt,
      leaderboards: limitedLeaderboards,
    });
  } catch (error) {
    return ctx.handleError(error);
  }
}
