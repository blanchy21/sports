/**
 * Tests for the Premium Account System
 */

import {
  getPremiumTier,
  getPremiumStatus,
  hasMinimumTier,
  getNextTier,
  getTierProgress,
  PREMIUM_THRESHOLDS,
  PREMIUM_TIER_INFO,
} from '@/lib/premium/checker';

import {
  hasFeature,
  getAvailableFeatures,
  getNextTierFeatures,
  shouldShowAds,
  hasPriorityCuration,
  canAccessExclusiveContests,
  hasBoostedVisibility,
  TIER_FEATURES,
  FEATURE_MIN_TIER,
} from '@/lib/premium/features';

describe('Premium Tier Checker', () => {
  describe('getPremiumTier', () => {
    it('should return null for users below Bronze threshold', () => {
      expect(getPremiumTier(0)).toBeNull();
      expect(getPremiumTier(500)).toBeNull();
      expect(getPremiumTier(999)).toBeNull();
    });

    it('should return BRONZE for users with 1000-4999 MEDALS', () => {
      expect(getPremiumTier(1000)).toBe('BRONZE');
      expect(getPremiumTier(2500)).toBe('BRONZE');
      expect(getPremiumTier(4999)).toBe('BRONZE');
    });

    it('should return SILVER for users with 5000-24999 MEDALS', () => {
      expect(getPremiumTier(5000)).toBe('SILVER');
      expect(getPremiumTier(10000)).toBe('SILVER');
      expect(getPremiumTier(24999)).toBe('SILVER');
    });

    it('should return GOLD for users with 25000-99999 MEDALS', () => {
      expect(getPremiumTier(25000)).toBe('GOLD');
      expect(getPremiumTier(50000)).toBe('GOLD');
      expect(getPremiumTier(99999)).toBe('GOLD');
    });

    it('should return PLATINUM for users with 100000+ MEDALS', () => {
      expect(getPremiumTier(100000)).toBe('PLATINUM');
      expect(getPremiumTier(500000)).toBe('PLATINUM');
      expect(getPremiumTier(1000000)).toBe('PLATINUM');
    });
  });

  describe('hasMinimumTier', () => {
    it('should return false for users without a tier', () => {
      expect(hasMinimumTier(500, 'BRONZE')).toBe(false);
    });

    it('should return true when user meets required tier', () => {
      expect(hasMinimumTier(1000, 'BRONZE')).toBe(true);
      expect(hasMinimumTier(5000, 'SILVER')).toBe(true);
      expect(hasMinimumTier(25000, 'GOLD')).toBe(true);
      expect(hasMinimumTier(100000, 'PLATINUM')).toBe(true);
    });

    it('should return true when user exceeds required tier', () => {
      expect(hasMinimumTier(5000, 'BRONZE')).toBe(true);
      expect(hasMinimumTier(25000, 'SILVER')).toBe(true);
      expect(hasMinimumTier(100000, 'GOLD')).toBe(true);
    });

    it('should return false when user is below required tier', () => {
      expect(hasMinimumTier(1000, 'SILVER')).toBe(false);
      expect(hasMinimumTier(5000, 'GOLD')).toBe(false);
      expect(hasMinimumTier(25000, 'PLATINUM')).toBe(false);
    });
  });

  describe('getNextTier', () => {
    it('should return BRONZE for non-premium users', () => {
      const result = getNextTier(500);
      expect(result).toEqual({
        tier: 'BRONZE',
        threshold: 1000,
        needed: 500,
      });
    });

    it('should return SILVER for Bronze users', () => {
      const result = getNextTier(2000);
      expect(result).toEqual({
        tier: 'SILVER',
        threshold: 5000,
        needed: 3000,
      });
    });

    it('should return GOLD for Silver users', () => {
      const result = getNextTier(10000);
      expect(result).toEqual({
        tier: 'GOLD',
        threshold: 25000,
        needed: 15000,
      });
    });

    it('should return PLATINUM for Gold users', () => {
      const result = getNextTier(50000);
      expect(result).toEqual({
        tier: 'PLATINUM',
        threshold: 100000,
        needed: 50000,
      });
    });

    it('should return null for Platinum users', () => {
      expect(getNextTier(100000)).toBeNull();
      expect(getNextTier(200000)).toBeNull();
    });
  });

  describe('getTierProgress', () => {
    it('should return 0 for users with 0 MEDALS', () => {
      expect(getTierProgress(0)).toBe(0);
    });

    it('should return correct progress towards Bronze', () => {
      expect(getTierProgress(500)).toBe(50);
    });

    it('should return correct progress towards Silver', () => {
      // Bronze is 1000, Silver is 5000, range is 4000
      // At 3000, we're 2000 into the range = 50%
      expect(getTierProgress(3000)).toBe(50);
    });

    it('should return 100 for Platinum users', () => {
      expect(getTierProgress(100000)).toBe(100);
      expect(getTierProgress(200000)).toBe(100);
    });
  });

  describe('getPremiumStatus', () => {
    it('should return complete status for non-premium user', () => {
      const status = getPremiumStatus(500);
      expect(status.tier).toBeNull();
      expect(status.isPremium).toBe(false);
      expect(status.stakedMedals).toBe(500);
      expect(status.nextTier?.tier).toBe('BRONZE');
      expect(status.tierInfo).toBeNull();
    });

    it('should return complete status for premium user', () => {
      const status = getPremiumStatus(5000);
      expect(status.tier).toBe('SILVER');
      expect(status.isPremium).toBe(true);
      expect(status.stakedMedals).toBe(5000);
      expect(status.nextTier?.tier).toBe('GOLD');
      expect(status.tierInfo).toEqual(PREMIUM_TIER_INFO.SILVER);
    });
  });
});

describe('Premium Feature Flags', () => {
  describe('hasFeature', () => {
    it('should return false for non-premium users', () => {
      expect(hasFeature(500, 'AD_FREE')).toBe(false);
      expect(hasFeature(500, 'BADGE_DISPLAY')).toBe(false);
    });

    it('should grant AD_FREE and BADGE_DISPLAY to Bronze users', () => {
      expect(hasFeature(1000, 'AD_FREE')).toBe(true);
      expect(hasFeature(1000, 'BADGE_DISPLAY')).toBe(true);
      expect(hasFeature(1000, 'PRIORITY_CURATION')).toBe(false);
    });

    it('should grant PRIORITY_CURATION to Silver users', () => {
      expect(hasFeature(5000, 'PRIORITY_CURATION')).toBe(true);
      expect(hasFeature(5000, 'EXCLUSIVE_CONTESTS')).toBe(false);
    });

    it('should grant EXCLUSIVE_CONTESTS to Gold users', () => {
      expect(hasFeature(25000, 'EXCLUSIVE_CONTESTS')).toBe(true);
      expect(hasFeature(25000, 'DIRECT_SUPPORT')).toBe(false);
    });

    it('should grant all features to Platinum users', () => {
      expect(hasFeature(100000, 'DIRECT_SUPPORT')).toBe(true);
      expect(hasFeature(100000, 'BOOSTED_VISIBILITY')).toBe(true);
    });
  });

  describe('getAvailableFeatures', () => {
    it('should return empty array for non-premium users', () => {
      expect(getAvailableFeatures(500)).toEqual([]);
    });

    it('should return correct features for Bronze users', () => {
      const features = getAvailableFeatures(1000);
      expect(features).toContain('AD_FREE');
      expect(features).toContain('BADGE_DISPLAY');
      expect(features).not.toContain('PRIORITY_CURATION');
    });

    it('should return all features for Platinum users', () => {
      const features = getAvailableFeatures(100000);
      expect(features).toHaveLength(Object.keys(FEATURE_MIN_TIER).length);
    });
  });

  describe('getNextTierFeatures', () => {
    it('should return Bronze features for non-premium users', () => {
      const features = getNextTierFeatures(null);
      expect(features).toEqual(TIER_FEATURES.BRONZE);
    });

    it('should return new features unlocked at next tier', () => {
      const features = getNextTierFeatures('BRONZE');
      expect(features).toContain('PRIORITY_CURATION');
      expect(features).not.toContain('AD_FREE'); // Already had this
    });

    it('should return empty array for Platinum users', () => {
      expect(getNextTierFeatures('PLATINUM')).toEqual([]);
    });
  });

  describe('convenience functions', () => {
    it('shouldShowAds returns correct values', () => {
      expect(shouldShowAds(500)).toBe(true);
      expect(shouldShowAds(1000)).toBe(false);
    });

    it('hasPriorityCuration returns correct values', () => {
      expect(hasPriorityCuration(1000)).toBe(false);
      expect(hasPriorityCuration(5000)).toBe(true);
    });

    it('canAccessExclusiveContests returns correct values', () => {
      expect(canAccessExclusiveContests(5000)).toBe(false);
      expect(canAccessExclusiveContests(25000)).toBe(true);
    });

    it('hasBoostedVisibility returns correct values', () => {
      expect(hasBoostedVisibility(25000)).toBe(false);
      expect(hasBoostedVisibility(100000)).toBe(true);
    });
  });
});

describe('Premium Thresholds Configuration', () => {
  it('should have correct threshold values', () => {
    expect(PREMIUM_THRESHOLDS.BRONZE).toBe(1000);
    expect(PREMIUM_THRESHOLDS.SILVER).toBe(5000);
    expect(PREMIUM_THRESHOLDS.GOLD).toBe(25000);
    expect(PREMIUM_THRESHOLDS.PLATINUM).toBe(100000);
  });

  it('should have tier info for all tiers', () => {
    expect(PREMIUM_TIER_INFO.BRONZE).toBeDefined();
    expect(PREMIUM_TIER_INFO.SILVER).toBeDefined();
    expect(PREMIUM_TIER_INFO.GOLD).toBeDefined();
    expect(PREMIUM_TIER_INFO.PLATINUM).toBeDefined();
  });

  it('tier thresholds should match tier info', () => {
    expect(PREMIUM_TIER_INFO.BRONZE.threshold).toBe(PREMIUM_THRESHOLDS.BRONZE);
    expect(PREMIUM_TIER_INFO.SILVER.threshold).toBe(PREMIUM_THRESHOLDS.SILVER);
    expect(PREMIUM_TIER_INFO.GOLD.threshold).toBe(PREMIUM_THRESHOLDS.GOLD);
    expect(PREMIUM_TIER_INFO.PLATINUM.threshold).toBe(PREMIUM_THRESHOLDS.PLATINUM);
  });
});
