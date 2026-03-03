/**
 * My Rank API
 *
 * Returns the authenticated user's rank on each leaderboard category
 * for the current week.
 *
 * GET /api/leaderboard/my-rank
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import {
  getLeaderboards,
  generateWeeklyLeaderboards,
  getCurrentWeekId,
  getUserRankForCategory,
} from '@/lib/metrics/leaderboard';
import { ACTIVE_CATEGORIES } from '@/lib/metrics/category-config';
import type { RewardCategory } from '@/lib/metrics/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUserFromSession(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const weekId = getCurrentWeekId();

    // Get current standings (generate if missing)
    let leaderboards = await getLeaderboards(weekId);
    if (!leaderboards) {
      leaderboards = await generateWeeklyLeaderboards(weekId);
    }

    // Calculate rank for each active category
    const ranks: Record<string, { rank: number | null; value: number }> = {};

    for (const category of ACTIVE_CATEGORIES) {
      const entries = leaderboards.leaderboards[category] || [];
      ranks[category] = await getUserRankForCategory(
        authUser.username,
        category as RewardCategory,
        weekId,
        entries
      );
    }

    return NextResponse.json({
      success: true,
      username: authUser.username,
      weekId,
      ranks,
      generatedAt: leaderboards.generatedAt,
    });
  } catch (error) {
    console.error('[my-rank] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
  }
}
