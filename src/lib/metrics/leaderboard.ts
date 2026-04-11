/**
 * Leaderboard Aggregator
 *
 * Compiles weekly metrics into leaderboards for content rewards.
 */

import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { getWeekId } from '@/lib/rewards/staking-distribution';
import { CONTENT_REWARDS, getPlatformYear } from '@/lib/rewards/config';
import type {
  LeaderboardEntry,
  RewardCategory,
  WeeklyLeaderboards,
  PostMetrics,
  UserMetrics,
  ContentRewardDistribution,
} from './types';

/**
 * Get the current week ID
 */
export function getCurrentWeekId(): string {
  return getWeekId(new Date());
}

/**
 * Get the Monday (start) of an ISO week from a weekId like "2026-W14".
 */
function getWeekStartDate(weekId: string): Date {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return new Date();
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = jan4.getDay() || 7; // Mon=1..Sun=7
  const mondayOfWeek1 = new Date(jan4.getTime() - (jan4DayOfWeek - 1) * 86400000);
  return new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000);
}

/**
 * Generate leaderboards for a specific week
 */
export async function generateWeeklyLeaderboards(weekId?: string): Promise<WeeklyLeaderboards> {
  const targetWeekId = weekId || getCurrentWeekId();

  // Fetch all post metrics for the week
  const postMetrics = await prisma.postMetric.findMany({
    where: { weekId: targetWeekId },
  });
  const posts: PostMetrics[] = postMetrics as unknown as PostMetrics[];

  // Fetch all user metrics for the week
  const userMetrics = await prisma.userMetric.findMany({
    where: { weekId: targetWeekId },
  });
  const users: UserMetrics[] = userMetrics as unknown as UserMetrics[];

  const leaderboards: Partial<Record<RewardCategory, LeaderboardEntry[]>> = {};

  // Most External Views - posts with highest external clicks
  leaderboards.MOST_EXTERNAL_VIEWS = posts
    .sort((a, b) => b.externalClicks - a.externalClicks)
    .slice(0, 50)
    .map((post, index) => ({
      rank: index + 1,
      account: post.author,
      postId: post.postId,
      permlink: post.permlink,
      value: post.externalClicks,
    }));

  // Most Viewed Post - highest total views
  leaderboards.MOST_VIEWED_POST = posts
    .sort((a, b) => b.views - a.views)
    .slice(0, 50)
    .map((post, index) => ({
      rank: index + 1,
      account: post.author,
      postId: post.postId,
      permlink: post.permlink,
      value: post.views,
    }));

  // Most Comments Made - users who commented the most
  leaderboards.MOST_COMMENTS = users
    .sort((a, b) => b.commentsMade - a.commentsMade)
    .slice(0, 50)
    .map((user, index) => ({
      rank: index + 1,
      account: user.account,
      value: user.commentsMade,
    }));

  // Most Engaged Post - highest total engagement (votes + comments + shares)
  leaderboards.MOST_ENGAGED_POST = posts
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 50)
    .map((post, index) => ({
      rank: index + 1,
      account: post.author,
      postId: post.postId,
      permlink: post.permlink,
      value: post.totalEngagement,
    }));

  // Most Curated — posts with the most curator curations this week
  const weekStart = getWeekStartDate(targetWeekId);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const curationCounts = await prisma.curation.groupBy({
    by: ['author', 'permlink'],
    where: {
      status: 'completed',
      createdAt: { gte: weekStart, lt: weekEnd },
    },
    _count: { id: true },
    _sum: { amount: true },
    orderBy: { _count: { id: 'desc' } },
    take: 50,
  });

  leaderboards.MOST_CURATED = curationCounts.map((entry, index) => ({
    rank: index + 1,
    account: entry.author,
    postId: `${entry.author}/${entry.permlink}`,
    permlink: entry.permlink,
    value: entry._count.id,
  }));

  // Post of the Week — auto-populated from the most curated post
  if (curationCounts.length > 0) {
    const topCurated = curationCounts[0];
    leaderboards.POST_OF_THE_WEEK = [
      {
        rank: 1,
        account: topCurated.author,
        postId: `${topCurated.author}/${topCurated.permlink}`,
        permlink: topCurated.permlink,
        value: topCurated._count.id,
      },
    ];
  } else {
    leaderboards.POST_OF_THE_WEEK = [];
  }

  // Best Newcomer - only in Year 4+ (placeholder - requires account age check)
  const platformYear = getPlatformYear();
  if (platformYear >= 4) {
    leaderboards.BEST_NEWCOMER = [];
  }

  const result: WeeklyLeaderboards = {
    weekId: targetWeekId,
    generatedAt: new Date(),
    leaderboards: leaderboards as Record<RewardCategory, LeaderboardEntry[]>,
  };

  // Store the generated leaderboards
  await storeLeaderboards(result);

  return result;
}

/**
 * Store leaderboards in database
 */
async function storeLeaderboards(leaderboards: WeeklyLeaderboards): Promise<void> {
  try {
    await prisma.leaderboard.upsert({
      where: { weekId: leaderboards.weekId },
      create: {
        weekId: leaderboards.weekId,
        entries: leaderboards.leaderboards as unknown as Prisma.InputJsonValue,
        generatedAt: leaderboards.generatedAt,
      },
      update: {
        entries: leaderboards.leaderboards as unknown as Prisma.InputJsonValue,
        generatedAt: leaderboards.generatedAt,
      },
    });
  } catch (error) {
    console.error('Error storing leaderboards:', error);
    throw error;
  }
}

/**
 * Get stored leaderboards for a week
 */
export async function getLeaderboards(weekId?: string): Promise<WeeklyLeaderboards | null> {
  try {
    const targetWeekId = weekId || getCurrentWeekId();
    const record = await prisma.leaderboard.findUnique({
      where: { weekId: targetWeekId },
    });

    if (!record) {
      return null;
    }

    return {
      weekId: record.weekId,
      generatedAt: record.generatedAt,
      leaderboards: record.entries as unknown as Record<RewardCategory, LeaderboardEntry[]>,
    };
  } catch (error) {
    console.error('Error getting leaderboards:', error);
    return null;
  }
}

/**
 * Get leaderboard for a specific category
 */
export async function getCategoryLeaderboard(
  category: RewardCategory,
  weekId?: string,
  maxEntries: number = 10
): Promise<LeaderboardEntry[]> {
  const leaderboards = await getLeaderboards(weekId);

  if (!leaderboards) {
    return [];
  }

  return leaderboards.leaderboards[category]?.slice(0, maxEntries) || [];
}

/**
 * Calculate reward distributions based on leaderboards
 */
export function calculateContentRewards(
  leaderboards: WeeklyLeaderboards
): ContentRewardDistribution[] {
  const distributions: ContentRewardDistribution[] = [];
  const platformYear = getPlatformYear();

  // Process each reward category
  for (const [categoryKey, config] of Object.entries(CONTENT_REWARDS)) {
    const category = categoryKey as RewardCategory;

    // Skip Best Newcomer in Years 1-3
    if (category === 'BEST_NEWCOMER' && platformYear < 4) {
      continue;
    }

    // Skip Post of the Week if no curator selection
    if (category === 'POST_OF_THE_WEEK') {
      // This requires manual curator selection
      continue;
    }

    const entries = leaderboards.leaderboards[category] || [];
    const winner = entries[0];

    if (!winner || winner.value === 0) {
      continue;
    }

    // Get reward amount
    let amount: number;
    if ('reward' in config) {
      amount = config.reward;
    } else if ('minReward' in config && 'maxReward' in config) {
      // For variable rewards, use max for now (could be based on engagement)
      amount = config.maxReward;
    } else {
      continue;
    }

    distributions.push({
      weekId: leaderboards.weekId,
      category,
      winner: {
        account: winner.account,
        postId: winner.postId,
        value: winner.value,
      },
      amount,
      status: 'pending',
    });
  }

  return distributions;
}

/**
 * Set the Post of the Week (curator selected)
 */
export async function setPostOfTheWeek(
  weekId: string,
  author: string,
  permlink: string,
  selectedBy: string
): Promise<void> {
  try {
    const record = await prisma.leaderboard.findUnique({ where: { weekId } });

    if (!record) {
      throw new Error(`Leaderboards for ${weekId} not found`);
    }

    const entries = record.entries as unknown as Record<RewardCategory, LeaderboardEntry[]>;
    entries.POST_OF_THE_WEEK = [
      {
        rank: 1,
        account: author,
        postId: `${author}/${permlink}`,
        permlink,
        value: 1,
      },
    ];

    await prisma.leaderboard.update({
      where: { weekId },
      data: {
        entries: entries as unknown as Prisma.InputJsonValue,
        metadata: {
          postOfTheWeekSelectedBy: selectedBy,
          postOfTheWeekSelectedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error setting post of the week:', error);
    throw error;
  }
}

/**
 * Store content reward distributions
 */
export async function storeRewardDistributions(
  distributions: ContentRewardDistribution[]
): Promise<void> {
  try {
    for (const dist of distributions) {
      await prisma.contentReward.upsert({
        where: { weekId_category: { weekId: dist.weekId, category: dist.category } },
        create: {
          weekId: dist.weekId,
          category: dist.category,
          winner: dist.winner as unknown as Prisma.InputJsonValue,
          amount: dist.amount,
          status: dist.status,
        },
        update: {
          winner: dist.winner as unknown as Prisma.InputJsonValue,
          amount: dist.amount,
          status: dist.status,
        },
      });
    }
  } catch (error) {
    console.error('Error storing reward distributions:', error);
    throw error;
  }
}

/**
 * Get a user's rank and value for a specific leaderboard category.
 *
 * If the user is in the stored entries (top 50), returns their rank directly.
 * Otherwise, queries the raw metrics to calculate their value and counts
 * how many stored entries score higher to determine approximate rank.
 */
export async function getUserRankForCategory(
  username: string,
  category: RewardCategory,
  weekId: string,
  entries: LeaderboardEntry[]
): Promise<{ rank: number | null; value: number }> {
  // Check if user is already in the leaderboard entries
  const existing = entries.find((e) => e.account === username);
  if (existing) {
    return { rank: existing.rank, value: existing.value };
  }

  // Not in top entries — query raw metrics for their value
  let userValue = 0;

  try {
    if (category === 'MOST_COMMENTS') {
      // User-based: query UserMetric
      const metric = await prisma.userMetric.findUnique({
        where: { weekId_account: { weekId, account: username } },
      });
      userValue = metric?.commentsMade ?? 0;
    } else if (category === 'MOST_CURATED' || category === 'POST_OF_THE_WEEK') {
      // Curation-based: count curations on user's posts this week
      const weekStartDate = getWeekStartDate(weekId);
      const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const curationCount = await prisma.curation.count({
        where: {
          author: username,
          status: 'completed',
          createdAt: { gte: weekStartDate, lt: weekEndDate },
        },
      });
      userValue = curationCount;
    } else {
      // Post-based: query user's PostMetric rows, take the max
      const fieldMap: Record<string, string> = {
        MOST_EXTERNAL_VIEWS: 'externalClicks',
        MOST_VIEWED_POST: 'views',
        MOST_ENGAGED_POST: 'totalEngagement',
      };

      const field = fieldMap[category];
      if (!field) return { rank: null, value: 0 };

      const userPosts = await prisma.postMetric.findMany({
        where: { weekId, author: username },
        orderBy: { [field]: 'desc' },
        take: 1,
      });

      if (userPosts.length > 0) {
        userValue = (userPosts[0] as unknown as Record<string, number>)[field] ?? 0;
      }
    }
  } catch (error) {
    console.error(`Error getting user rank for ${category}:`, error);
    return { rank: null, value: 0 };
  }

  if (userValue === 0) {
    return { rank: null, value: 0 };
  }

  // Count how many entries score higher to determine approximate rank
  const higherCount = entries.filter((e) => e.value > userValue).length;
  return { rank: higherCount + 1, value: userValue };
}

/**
 * Get reward distributions for a week
 */
export async function getRewardDistributions(weekId: string): Promise<ContentRewardDistribution[]> {
  try {
    const rewards = await prisma.contentReward.findMany({
      where: { weekId },
    });

    return rewards.map(
      (r: {
        weekId: string;
        category: string;
        winner: unknown;
        amount: { toNumber(): number };
        status: string;
      }) => ({
        weekId: r.weekId,
        category: r.category as RewardCategory,
        winner: r.winner as unknown as { account: string; postId?: string; value: number },
        amount: r.amount.toNumber(),
        status: r.status as 'pending' | 'distributed' | 'failed',
      })
    );
  } catch (error) {
    console.error('Error getting reward distributions:', error);
    return [];
  }
}
