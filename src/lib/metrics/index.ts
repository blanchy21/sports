/**
 * Content Metrics System
 *
 * Exports for tracking views, engagement, and leaderboards.
 */

// Types
export type {
  EngagementType,
  EngagementEvent,
  PostMetrics,
  UserMetrics,
  LeaderboardEntry,
  RewardCategory,
  WeeklyLeaderboards,
  ContentRewardDistribution,
} from './types';

// Tracker
export {
  getPostId,
  parsePostId,
  getCurrentWeekId,
  getDayKey,
  trackEngagement,
  trackPostView,
  trackVote,
  trackComment,
  trackShare,
  trackPostCreation,
  getPostMetrics,
  getUserMetrics,
} from './tracker';

// Leaderboard
export {
  generateWeeklyLeaderboards,
  getLeaderboards,
  getCategoryLeaderboard,
  calculateContentRewards,
  setPostOfTheWeek,
  storeRewardDistributions,
  getRewardDistributions,
} from './leaderboard';
