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

/**
 * GET /api/metrics/leaderboard
 *
 * Query params:
 * - weekId: specific week (default: current week)
 * - category: specific category (returns all if not specified)
 * - limit: max entries per category (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekId = searchParams.get('weekId') || getCurrentWeekId();
    const category = searchParams.get('category') as RewardCategory | null;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

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
    console.error('Error fetching leaderboards:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
