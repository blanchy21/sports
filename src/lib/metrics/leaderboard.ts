/**
 * Leaderboard Aggregator
 *
 * Compiles weekly metrics into leaderboards for content rewards.
 */

import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
 * Generate leaderboards for a specific week
 */
export async function generateWeeklyLeaderboards(
  weekId?: string
): Promise<WeeklyLeaderboards> {
  const targetWeekId = weekId || getCurrentWeekId();

  // Return empty leaderboards if Firestore not configured
  if (!db) {
    return {
      weekId: targetWeekId,
      generatedAt: new Date(),
      leaderboards: {
        MOST_EXTERNAL_VIEWS: [],
        MOST_VIEWED_POST: [],
        MOST_COMMENTS: [],
        MOST_ENGAGED_POST: [],
        POST_OF_THE_WEEK: [],
        BEST_NEWCOMER: [],
      },
    };
  }

  // Fetch all post metrics for the week
  const postsRef = collection(db, 'metrics', 'posts', targetWeekId);
  const postsSnapshot = await getDocs(postsRef);
  const posts: PostMetrics[] = [];
  postsSnapshot.forEach((doc) => {
    posts.push(doc.data() as PostMetrics);
  });

  // Fetch all user metrics for the week
  const usersRef = collection(db, 'metrics', 'users', targetWeekId);
  const usersSnapshot = await getDocs(usersRef);
  const users: UserMetrics[] = [];
  usersSnapshot.forEach((doc) => {
    users.push(doc.data() as UserMetrics);
  });

  const leaderboards: Partial<Record<RewardCategory, LeaderboardEntry[]>> = {};

  // Most External Views - posts with highest external clicks
  leaderboards.MOST_EXTERNAL_VIEWS = posts
    .sort((a, b) => b.externalClicks - a.externalClicks)
    .slice(0, 10)
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
    .slice(0, 10)
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
    .slice(0, 10)
    .map((user, index) => ({
      rank: index + 1,
      account: user.account,
      value: user.commentsMade,
    }));

  // Most Engaged Post - highest total engagement (votes + comments + shares)
  leaderboards.MOST_ENGAGED_POST = posts
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 10)
    .map((post, index) => ({
      rank: index + 1,
      account: post.author,
      postId: post.postId,
      permlink: post.permlink,
      value: post.totalEngagement,
    }));

  // Post of the Week - curator selected (placeholder - requires manual selection)
  leaderboards.POST_OF_THE_WEEK = [];

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
 * Store leaderboards in Firestore
 */
async function storeLeaderboards(leaderboards: WeeklyLeaderboards): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(collection(db, 'leaderboards'), leaderboards.weekId);

    await setDoc(docRef, {
      ...leaderboards,
      generatedAt: leaderboards.generatedAt.toISOString(),
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
  if (!db) return null;
  try {
    const targetWeekId = weekId || getCurrentWeekId();
    const docRef = doc(collection(db, 'leaderboards'), targetWeekId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      generatedAt: new Date(data.generatedAt),
    } as WeeklyLeaderboards;
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
  if (!db) throw new Error('Firestore not configured');
  try {
    const docRef = doc(collection(db, 'leaderboards'), weekId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Leaderboards for ${weekId} not found`);
    }

    const data = docSnap.data() as WeeklyLeaderboards;
    data.leaderboards.POST_OF_THE_WEEK = [
      {
        rank: 1,
        account: author,
        postId: `${author}/${permlink}`,
        permlink,
        value: 1,
      },
    ];

    await setDoc(docRef, {
      ...data,
      generatedAt: data.generatedAt,
      postOfTheWeekSelectedBy: selectedBy,
      postOfTheWeekSelectedAt: new Date().toISOString(),
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
  if (!db) return;
  try {
    for (const dist of distributions) {
      const docId = `${dist.weekId}-${dist.category}`;
      const docRef = doc(collection(db, 'content-rewards'), docId);
      await setDoc(docRef, {
        ...dist,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error storing reward distributions:', error);
    throw error;
  }
}

/**
 * Get reward distributions for a week
 */
export async function getRewardDistributions(
  weekId: string
): Promise<ContentRewardDistribution[]> {
  if (!db) return [];
  try {
    const distributions: ContentRewardDistribution[] = [];

    // Get all possible categories
    const categories: RewardCategory[] = [
      'MOST_EXTERNAL_VIEWS',
      'MOST_VIEWED_POST',
      'MOST_COMMENTS',
      'MOST_ENGAGED_POST',
      'POST_OF_THE_WEEK',
      'BEST_NEWCOMER',
    ];

    for (const category of categories) {
      const docId = `${weekId}-${category}`;
      const docRef = doc(collection(db, 'content-rewards'), docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        distributions.push(docSnap.data() as ContentRewardDistribution);
      }
    }

    return distributions;
  } catch (error) {
    console.error('Error getting reward distributions:', error);
    return [];
  }
}
