export type BadgeCategory = 'content' | 'engagement' | 'predictions' | 'streak' | 'milestone';

export type BadgeTrigger =
  | 'post_created'
  | 'sportsbite_created'
  | 'comment_created'
  | 'prediction_settled'
  | 'streak_updated';

export type MedalsRank = 'rookie' | 'contender' | 'analyst' | 'pundit' | 'legend' | 'hall-of-fame';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string; // Lucide icon component name
  bgGradient: string;
  textColor: string;
  glowColor: string;
  /** Dot-path to stat field, e.g. 'totalPosts' or 'predictions.winRate' */
  metric: string;
  threshold: number;
  /** For rate metrics — min sample size (e.g. 10 predictions for win rate badge) */
  minSample?: number;
  /** Which actions can trigger inline evaluation. Empty = cron-only. */
  triggers: BadgeTrigger[];
}

export interface RankTier {
  rank: MedalsRank;
  label: string;
  min: number;
  max: number;
  bgGradient: string;
  textColor: string;
  icon: string;
}

/** Badge data as returned by the API (definition + award timestamp) */
export interface UserBadgeData {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  bgGradient: string;
  textColor: string;
  glowColor: string;
  awardedAt: string;
}

/** Rank data as returned by the API */
export interface UserRankData {
  score: number;
  label: string;
  rank: MedalsRank;
  bgGradient: string;
  textColor: string;
}

export interface UserSportRankData {
  sportId: string;
  score: number;
  label: string;
  rank: MedalsRank;
}
