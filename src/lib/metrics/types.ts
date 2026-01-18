/**
 * Content Metrics Types
 *
 * Type definitions for tracking post views, engagement, and weekly leaderboards.
 */

/**
 * Engagement types tracked by the platform
 */
export type EngagementType = 'view' | 'vote' | 'comment' | 'share' | 'external_click';

/**
 * Individual engagement event
 */
export interface EngagementEvent {
  postId: string; // Format: author/permlink
  author: string;
  permlink: string;
  type: EngagementType;
  viewerAccount?: string;
  referrer?: string;
  timestamp: Date;
  sessionId?: string;
}

/**
 * Aggregated metrics for a single post
 */
export interface PostMetrics {
  postId: string;
  author: string;
  permlink: string;
  views: number;
  uniqueViews: number;
  externalClicks: number;
  votes: number;
  comments: number;
  shares: number;
  totalEngagement: number;
  lastUpdated: Date;
}

/**
 * Aggregated metrics for a user over a time period
 */
export interface UserMetrics {
  account: string;
  period: 'day' | 'week' | 'month';
  periodKey: string; // e.g., "2025-W03" for week 3
  postsCreated: number;
  totalViews: number;
  totalExternalClicks: number;
  totalVotesReceived: number;
  commentsReceived: number;
  commentsMade: number;
  totalEngagement: number;
  topPost?: {
    postId: string;
    views: number;
    engagement: number;
  };
  lastUpdated: Date;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  account: string;
  postId?: string;
  permlink?: string;
  value: number;
  change?: number; // Change since last update
}

/**
 * Content reward categories
 */
export type RewardCategory =
  | 'MOST_EXTERNAL_VIEWS'
  | 'MOST_VIEWED_POST'
  | 'MOST_COMMENTS'
  | 'MOST_ENGAGED_POST'
  | 'POST_OF_THE_WEEK'
  | 'BEST_NEWCOMER';

/**
 * Weekly leaderboards structure
 */
export interface WeeklyLeaderboards {
  weekId: string;
  generatedAt: Date;
  leaderboards: Record<RewardCategory, LeaderboardEntry[]>;
}

/**
 * Reward distribution record
 */
export interface ContentRewardDistribution {
  weekId: string;
  category: RewardCategory;
  winner: {
    account: string;
    postId?: string;
    value: number;
  };
  amount: number;
  status: 'pending' | 'distributed' | 'failed';
  distributedAt?: Date;
  transactionId?: string;
}
