/**
 * Premium Module
 *
 * Exports all premium-related functionality for the Sportsblock platform.
 */

// Tier checking and status
export {
  type PremiumTier,
  type PremiumStatus,
  PREMIUM_THRESHOLDS,
  PREMIUM_TIER_INFO,
  getPremiumTier,
  getPremiumStatus,
  hasMinimumTier,
  getNextTier,
  getTierProgress,
} from './checker';

// Feature flags
export {
  type PremiumFeature,
  TIER_FEATURES,
  FEATURE_INFO,
  FEATURE_MIN_TIER,
  hasFeature,
  getAvailableFeatures,
  getNextTierFeatures,
  shouldShowAds,
  hasPriorityCuration,
  canAccessExclusiveContests,
  hasBoostedVisibility,
} from './features';

// React hooks (client-side only)
export {
  useStakedBalance,
  usePremiumStatus,
  usePremiumTier,
  useHasFeature,
  useAvailableFeatures,
  useShouldShowAds,
  useIsPremium,
} from './hooks';
