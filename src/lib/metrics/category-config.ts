/**
 * Leaderboard Category Configuration
 *
 * Shared between LeaderboardCard, MyRankCard, and any other UI
 * that needs to display category metadata.
 */

import { TrendingUp, Eye, MessageCircle, Share2, Star, Sparkles, Award } from 'lucide-react';
import type { RewardCategory } from './types';
import { CONTENT_REWARDS } from '@/lib/rewards/config';

export interface CategoryDisplayConfig {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  metric: string;
}

export const CATEGORY_CONFIG: Record<RewardCategory, CategoryDisplayConfig> = {
  MOST_EXTERNAL_VIEWS: {
    title: 'Most External Views',
    icon: TrendingUp,
    color: 'text-info',
    metric: 'external views',
  },
  MOST_VIEWED_POST: {
    title: 'Most Viewed Post',
    icon: Eye,
    color: 'text-purple-500',
    metric: 'views',
  },
  MOST_COMMENTS: {
    title: 'Top Commenter',
    icon: MessageCircle,
    color: 'text-success',
    metric: 'comments',
  },
  MOST_ENGAGED_POST: {
    title: 'Most Engaged Post',
    icon: Share2,
    color: 'text-orange-500',
    metric: 'engagements',
  },
  MOST_CURATED: {
    title: 'Most Curated',
    icon: Award,
    color: 'text-sb-gold',
    metric: 'curations',
  },
  POST_OF_THE_WEEK: {
    title: 'Post of the Week',
    icon: Star,
    color: 'text-warning',
    metric: 'curator pick',
  },
  BEST_NEWCOMER: {
    title: 'Best Newcomer',
    icon: Sparkles,
    color: 'text-pink-500',
    metric: 'engagement',
  },
};

/**
 * Categories shown in the main leaderboard (excluding placeholders)
 */
export const ACTIVE_CATEGORIES: RewardCategory[] = [
  'MOST_EXTERNAL_VIEWS',
  'MOST_VIEWED_POST',
  'MOST_COMMENTS',
  'MOST_ENGAGED_POST',
  'MOST_CURATED',
];

/**
 * Get MEDALS reward amount for a category, or null if none.
 */
export function getRewardAmount(category: RewardCategory): number | null {
  const config = CONTENT_REWARDS[category];
  if (!config) return null;
  if ('reward' in config) return config.reward;
  if ('maxReward' in config) return config.maxReward;
  return null;
}
