/**
 * Content Metrics Tracker
 *
 * Tracks views, engagement, and other metrics for posts.
 * Uses Prisma for persistence.
 */

import { prisma } from '@/lib/db/prisma';
import { getWeekId } from '@/lib/rewards/staking-distribution';
import type { EngagementEvent, EngagementType, PostMetrics, UserMetrics } from './types';

/**
 * Generate a post ID from author and permlink
 */
export function getPostId(author: string, permlink: string): string {
  return `${author}/${permlink}`;
}

/**
 * Parse a post ID into author and permlink
 */
export function parsePostId(postId: string): { author: string; permlink: string } {
  const [author, permlink] = postId.split('/');
  return { author, permlink };
}

/**
 * Get the current week ID for metrics aggregation
 */
export function getCurrentWeekId(): string {
  return getWeekId(new Date());
}

/**
 * Get the current day key for daily aggregation
 */
export function getDayKey(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Track a single engagement event
 */
export async function trackEngagement(event: EngagementEvent): Promise<void> {
  try {
    const weekId = getWeekId(event.timestamp);

    const incrementField = getIncrementField(event.type);

    // Update post metrics using upsert
    const postUpdateData: Record<string, unknown> = {
      [incrementField]: { increment: 1 },
      totalEngagement: { increment: event.type === 'view' ? 0 : 1 },
      lastUpdated: new Date(),
    };

    const postCreateData: Record<string, unknown> = {
      weekId,
      postId: event.postId,
      author: event.author,
      permlink: event.permlink,
      views: 0,
      uniqueViews: 0,
      externalClicks: 0,
      votes: 0,
      comments: 0,
      shares: 0,
      totalEngagement: event.type !== 'view' ? 1 : 0,
      lastUpdated: new Date(),
      [incrementField]: 1,
    };

    await prisma.postMetric.upsert({
      where: { weekId_postId: { weekId, postId: event.postId } },
      create: postCreateData as Parameters<typeof prisma.postMetric.create>[0]['data'],
      update: postUpdateData as Parameters<typeof prisma.postMetric.update>[0]['data'],
    });

    // Update user metrics (for post author)
    const userIncrementField = getUserIncrementField(event.type);

    const userUpdateData: Record<string, unknown> = {
      [userIncrementField]: { increment: 1 },
      totalEngagement: { increment: event.type === 'view' ? 0 : 1 },
      lastUpdated: new Date(),
    };

    const userCreateData: Record<string, unknown> = {
      weekId,
      account: event.author,
      period: 'week',
      periodKey: weekId,
      postsCreated: 0,
      totalViews: 0,
      totalExternalClicks: 0,
      totalVotesReceived: 0,
      commentsReceived: 0,
      commentsMade: 0,
      totalEngagement: 0,
      lastUpdated: new Date(),
      [userIncrementField]: 1,
    };

    await prisma.userMetric.upsert({
      where: { weekId_account: { weekId, account: event.author } },
      create: userCreateData as Parameters<typeof prisma.userMetric.create>[0]['data'],
      update: userUpdateData as Parameters<typeof prisma.userMetric.update>[0]['data'],
    });

    // If there's a viewer account and they made a comment, update their comment count
    if (event.type === 'comment' && event.viewerAccount && event.viewerAccount !== event.author) {
      await prisma.userMetric.upsert({
        where: { weekId_account: { weekId, account: event.viewerAccount } },
        create: {
          weekId,
          account: event.viewerAccount,
          period: 'week',
          periodKey: weekId,
          postsCreated: 0,
          totalViews: 0,
          totalExternalClicks: 0,
          totalVotesReceived: 0,
          commentsReceived: 0,
          commentsMade: 1,
          totalEngagement: 0,
          lastUpdated: new Date(),
        },
        update: {
          commentsMade: { increment: 1 },
          lastUpdated: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('Error tracking engagement:', error);
    // Don't throw - metrics tracking should not break the app
  }
}

/**
 * Track a post view
 */
export async function trackPostView(
  author: string,
  permlink: string,
  viewerAccount?: string,
  referrer?: string
): Promise<void> {
  const isExternal = referrer && !referrer.includes('sportsblock');

  await trackEngagement({
    postId: getPostId(author, permlink),
    author,
    permlink,
    type: 'view',
    viewerAccount,
    referrer,
    timestamp: new Date(),
  });

  // Track external click separately if applicable
  if (isExternal) {
    await trackEngagement({
      postId: getPostId(author, permlink),
      author,
      permlink,
      type: 'external_click',
      viewerAccount,
      referrer,
      timestamp: new Date(),
    });
  }
}

/**
 * Track a vote on a post
 */
export async function trackVote(author: string, permlink: string, voter: string): Promise<void> {
  await trackEngagement({
    postId: getPostId(author, permlink),
    author,
    permlink,
    type: 'vote',
    viewerAccount: voter,
    timestamp: new Date(),
  });
}

/**
 * Track a comment on a post
 */
export async function trackComment(
  author: string,
  permlink: string,
  commenter: string
): Promise<void> {
  await trackEngagement({
    postId: getPostId(author, permlink),
    author,
    permlink,
    type: 'comment',
    viewerAccount: commenter,
    timestamp: new Date(),
  });
}

/**
 * Track a share of a post
 */
export async function trackShare(author: string, permlink: string, sharer?: string): Promise<void> {
  await trackEngagement({
    postId: getPostId(author, permlink),
    author,
    permlink,
    type: 'share',
    viewerAccount: sharer,
    timestamp: new Date(),
  });
}

/**
 * Track a new post creation
 */
export async function trackPostCreation(author: string): Promise<void> {
  try {
    const weekId = getCurrentWeekId();

    await prisma.userMetric.upsert({
      where: { weekId_account: { weekId, account: author } },
      create: {
        weekId,
        account: author,
        period: 'week',
        periodKey: weekId,
        postsCreated: 1,
        totalViews: 0,
        totalExternalClicks: 0,
        totalVotesReceived: 0,
        commentsReceived: 0,
        commentsMade: 0,
        totalEngagement: 0,
        lastUpdated: new Date(),
      },
      update: {
        postsCreated: { increment: 1 },
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error('Error tracking post creation:', error);
  }
}

/**
 * Get post metrics for a specific post
 */
export async function getPostMetrics(
  author: string,
  permlink: string,
  weekId?: string
): Promise<PostMetrics | null> {
  try {
    const targetWeekId = weekId || getCurrentWeekId();
    const postId = getPostId(author, permlink);

    const metric = await prisma.postMetric.findUnique({
      where: { weekId_postId: { weekId: targetWeekId, postId } },
    });

    if (!metric) return null;

    return metric as unknown as PostMetrics;
  } catch (error) {
    console.error('Error getting post metrics:', error);
    return null;
  }
}

/**
 * Get user metrics for a specific user
 */
export async function getUserMetrics(
  account: string,
  weekId?: string
): Promise<UserMetrics | null> {
  try {
    const targetWeekId = weekId || getCurrentWeekId();

    const metric = await prisma.userMetric.findUnique({
      where: { weekId_account: { weekId: targetWeekId, account } },
    });

    if (!metric) return null;

    return metric as unknown as UserMetrics;
  } catch (error) {
    console.error('Error getting user metrics:', error);
    return null;
  }
}

/**
 * Helper: Get the field name to increment for engagement type
 */
function getIncrementField(type: EngagementType): string {
  switch (type) {
    case 'view':
      return 'views';
    case 'vote':
      return 'votes';
    case 'comment':
      return 'comments';
    case 'share':
      return 'shares';
    case 'external_click':
      return 'externalClicks';
    default:
      return 'views';
  }
}

/**
 * Helper: Get the user metrics field name to increment
 */
function getUserIncrementField(type: EngagementType): string {
  switch (type) {
    case 'view':
      return 'totalViews';
    case 'vote':
      return 'totalVotesReceived';
    case 'comment':
      return 'commentsReceived';
    case 'share':
      return 'totalEngagement';
    case 'external_click':
      return 'totalExternalClicks';
    default:
      return 'totalViews';
  }
}
