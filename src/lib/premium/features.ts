/**
 * Premium Feature Flags
 *
 * Defines which features are available at each premium tier.
 * Features are progressively unlocked as users stake more MEDALS.
 */

import { PremiumTier, hasMinimumTier } from './checker';

/**
 * Available premium features
 */
export type PremiumFeature =
  | 'AD_FREE'              // No ads displayed
  | 'BADGE_DISPLAY'        // Show premium badge on profile/posts
  | 'PRIORITY_CURATION'    // Higher chance of curator votes
  | 'EXCLUSIVE_CONTESTS'   // Access to premium-only contests
  | 'DIRECT_SUPPORT'       // Direct line to support team
  | 'CUSTOM_PROFILE'       // Custom profile themes/colors
  | 'EARLY_ACCESS'         // Early access to new features
  | 'ANALYTICS_DASHBOARD'  // Advanced post analytics
  | 'BOOSTED_VISIBILITY';  // Posts get extra visibility

/**
 * Feature configuration for each tier
 */
export const TIER_FEATURES: Record<PremiumTier, PremiumFeature[]> = {
  BRONZE: [
    'AD_FREE',
    'BADGE_DISPLAY',
  ],
  SILVER: [
    'AD_FREE',
    'BADGE_DISPLAY',
    'PRIORITY_CURATION',
    'EARLY_ACCESS',
  ],
  GOLD: [
    'AD_FREE',
    'BADGE_DISPLAY',
    'PRIORITY_CURATION',
    'EARLY_ACCESS',
    'EXCLUSIVE_CONTESTS',
    'CUSTOM_PROFILE',
    'ANALYTICS_DASHBOARD',
  ],
  PLATINUM: [
    'AD_FREE',
    'BADGE_DISPLAY',
    'PRIORITY_CURATION',
    'EARLY_ACCESS',
    'EXCLUSIVE_CONTESTS',
    'CUSTOM_PROFILE',
    'ANALYTICS_DASHBOARD',
    'DIRECT_SUPPORT',
    'BOOSTED_VISIBILITY',
  ],
};

/**
 * Feature descriptions for UI display
 */
export const FEATURE_INFO: Record<PremiumFeature, {
  name: string;
  description: string;
  icon: string; // Lucide icon name
}> = {
  AD_FREE: {
    name: 'Ad-Free Browsing',
    description: 'Enjoy Sportsblock without any advertisements',
    icon: 'Ban',
  },
  BADGE_DISPLAY: {
    name: 'Premium Badge',
    description: 'Display your premium tier badge on your profile and posts',
    icon: 'Award',
  },
  PRIORITY_CURATION: {
    name: 'Priority Curation',
    description: 'Your posts are prioritized for curator review',
    icon: 'Star',
  },
  EXCLUSIVE_CONTESTS: {
    name: 'Exclusive Contests',
    description: 'Access to premium-only prediction contests with bigger prizes',
    icon: 'Trophy',
  },
  DIRECT_SUPPORT: {
    name: 'Direct Support',
    description: 'Priority access to the Sportsblock support team',
    icon: 'Headphones',
  },
  CUSTOM_PROFILE: {
    name: 'Custom Profile',
    description: 'Customize your profile with unique themes and colors',
    icon: 'Palette',
  },
  EARLY_ACCESS: {
    name: 'Early Access',
    description: 'Be the first to try new features before public release',
    icon: 'Rocket',
  },
  ANALYTICS_DASHBOARD: {
    name: 'Analytics Dashboard',
    description: 'Advanced analytics for your posts and engagement',
    icon: 'BarChart2',
  },
  BOOSTED_VISIBILITY: {
    name: 'Boosted Visibility',
    description: 'Your posts get extra visibility in the feed',
    icon: 'TrendingUp',
  },
};

/**
 * Minimum tier required for each feature
 */
export const FEATURE_MIN_TIER: Record<PremiumFeature, PremiumTier> = {
  AD_FREE: 'BRONZE',
  BADGE_DISPLAY: 'BRONZE',
  PRIORITY_CURATION: 'SILVER',
  EARLY_ACCESS: 'SILVER',
  EXCLUSIVE_CONTESTS: 'GOLD',
  CUSTOM_PROFILE: 'GOLD',
  ANALYTICS_DASHBOARD: 'GOLD',
  DIRECT_SUPPORT: 'PLATINUM',
  BOOSTED_VISIBILITY: 'PLATINUM',
};

/**
 * Check if a user has access to a specific feature
 * @param stakedMedals - Amount of MEDALS staked
 * @param feature - Feature to check
 * @returns True if user has access to the feature
 */
export function hasFeature(stakedMedals: number, feature: PremiumFeature): boolean {
  const requiredTier = FEATURE_MIN_TIER[feature];
  return hasMinimumTier(stakedMedals, requiredTier);
}

/**
 * Get all features available to a user
 * @param stakedMedals - Amount of MEDALS staked
 * @returns Array of available features
 */
export function getAvailableFeatures(stakedMedals: number): PremiumFeature[] {
  return (Object.keys(FEATURE_MIN_TIER) as PremiumFeature[]).filter(
    feature => hasFeature(stakedMedals, feature)
  );
}

/**
 * Get features that would be unlocked at the next tier
 * @param currentTier - Current premium tier (or null)
 * @returns Array of features unlocked at next tier
 */
export function getNextTierFeatures(currentTier: PremiumTier | null): PremiumFeature[] {
  const tierOrder: (PremiumTier | null)[] = [null, 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex >= tierOrder.length - 1) {
    // Already at max tier
    return [];
  }

  const nextTier = tierOrder[currentIndex + 1] as PremiumTier;
  const currentFeatures = currentTier ? TIER_FEATURES[currentTier] : [];
  const nextFeatures = TIER_FEATURES[nextTier];

  // Return features that are new in the next tier
  return nextFeatures.filter(f => !currentFeatures.includes(f));
}

/**
 * Check if ads should be shown to a user
 * Convenience function for ad components
 * @param stakedMedals - Amount of MEDALS staked
 * @returns True if ads should be shown (user is NOT premium)
 */
export function shouldShowAds(stakedMedals: number): boolean {
  return !hasFeature(stakedMedals, 'AD_FREE');
}

/**
 * Check if user's posts should get priority curation
 * @param stakedMedals - Amount of MEDALS staked
 * @returns True if posts should be prioritized
 */
export function hasPriorityCuration(stakedMedals: number): boolean {
  return hasFeature(stakedMedals, 'PRIORITY_CURATION');
}

/**
 * Check if user can access exclusive contests
 * @param stakedMedals - Amount of MEDALS staked
 * @returns True if user can access exclusive contests
 */
export function canAccessExclusiveContests(stakedMedals: number): boolean {
  return hasFeature(stakedMedals, 'EXCLUSIVE_CONTESTS');
}

/**
 * Check if user has boosted post visibility
 * @param stakedMedals - Amount of MEDALS staked
 * @returns True if user's posts should get boosted visibility
 */
export function hasBoostedVisibility(stakedMedals: number): boolean {
  return hasFeature(stakedMedals, 'BOOSTED_VISIBILITY');
}
