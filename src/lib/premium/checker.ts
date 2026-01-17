/**
 * Premium Tier Checker
 *
 * Determines a user's premium tier based on their staked MEDALS balance.
 * Tiers unlock progressively better features on the platform.
 */

/**
 * Premium tier levels
 */
export type PremiumTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

/**
 * Premium tier thresholds (in MEDALS staked)
 * These values are from the MEDALS whitepaper
 */
export const PREMIUM_THRESHOLDS = {
  BRONZE: 1000,      // 1,000 MEDALS
  SILVER: 5000,      // 5,000 MEDALS
  GOLD: 25000,       // 25,000 MEDALS
  PLATINUM: 100000,  // 100,000 MEDALS
} as const;

/**
 * Premium tier metadata
 */
export const PREMIUM_TIER_INFO: Record<PremiumTier, {
  name: string;
  threshold: number;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  BRONZE: {
    name: 'Bronze',
    threshold: PREMIUM_THRESHOLDS.BRONZE,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    description: 'Ad-free browsing and Bronze badge',
  },
  SILVER: {
    name: 'Silver',
    threshold: PREMIUM_THRESHOLDS.SILVER,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    description: 'Priority curation and Silver badge',
  },
  GOLD: {
    name: 'Gold',
    threshold: PREMIUM_THRESHOLDS.GOLD,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    description: 'Exclusive contests and Gold badge',
  },
  PLATINUM: {
    name: 'Platinum',
    threshold: PREMIUM_THRESHOLDS.PLATINUM,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    description: 'Direct support access and Platinum badge',
  },
};

/**
 * Get the premium tier for a given staked MEDALS amount
 * @param stakedMedals - Amount of MEDALS staked
 * @returns The premium tier or null if below Bronze threshold
 */
export function getPremiumTier(stakedMedals: number): PremiumTier | null {
  if (stakedMedals >= PREMIUM_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (stakedMedals >= PREMIUM_THRESHOLDS.GOLD) return 'GOLD';
  if (stakedMedals >= PREMIUM_THRESHOLDS.SILVER) return 'SILVER';
  if (stakedMedals >= PREMIUM_THRESHOLDS.BRONZE) return 'BRONZE';
  return null;
}

/**
 * Check if user has at least a specific tier
 * @param stakedMedals - Amount of MEDALS staked
 * @param requiredTier - Minimum tier required
 * @returns True if user meets or exceeds the required tier
 */
export function hasMinimumTier(stakedMedals: number, requiredTier: PremiumTier): boolean {
  const currentTier = getPremiumTier(stakedMedals);
  if (!currentTier) return false;

  const tierOrder: PremiumTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const requiredIndex = tierOrder.indexOf(requiredTier);

  return currentIndex >= requiredIndex;
}

/**
 * Get the next tier and amount needed to reach it
 * @param stakedMedals - Current staked MEDALS amount
 * @returns Next tier info or null if at max tier
 */
export function getNextTier(stakedMedals: number): {
  tier: PremiumTier;
  threshold: number;
  needed: number;
} | null {
  if (stakedMedals >= PREMIUM_THRESHOLDS.PLATINUM) return null;

  if (stakedMedals < PREMIUM_THRESHOLDS.BRONZE) {
    return {
      tier: 'BRONZE',
      threshold: PREMIUM_THRESHOLDS.BRONZE,
      needed: PREMIUM_THRESHOLDS.BRONZE - stakedMedals,
    };
  }

  if (stakedMedals < PREMIUM_THRESHOLDS.SILVER) {
    return {
      tier: 'SILVER',
      threshold: PREMIUM_THRESHOLDS.SILVER,
      needed: PREMIUM_THRESHOLDS.SILVER - stakedMedals,
    };
  }

  if (stakedMedals < PREMIUM_THRESHOLDS.GOLD) {
    return {
      tier: 'GOLD',
      threshold: PREMIUM_THRESHOLDS.GOLD,
      needed: PREMIUM_THRESHOLDS.GOLD - stakedMedals,
    };
  }

  return {
    tier: 'PLATINUM',
    threshold: PREMIUM_THRESHOLDS.PLATINUM,
    needed: PREMIUM_THRESHOLDS.PLATINUM - stakedMedals,
  };
}

/**
 * Get progress towards next tier as a percentage
 * @param stakedMedals - Current staked MEDALS amount
 * @returns Progress percentage (0-100)
 */
export function getTierProgress(stakedMedals: number): number {
  const currentTier = getPremiumTier(stakedMedals);
  const nextTierInfo = getNextTier(stakedMedals);

  if (!nextTierInfo) {
    // At max tier
    return 100;
  }

  // Calculate progress within current tier range
  const currentThreshold = currentTier
    ? PREMIUM_THRESHOLDS[currentTier]
    : 0;
  const nextThreshold = nextTierInfo.threshold;
  const rangeSize = nextThreshold - currentThreshold;
  const progress = stakedMedals - currentThreshold;

  return Math.min(100, Math.max(0, (progress / rangeSize) * 100));
}

/**
 * Premium status for a user
 */
export interface PremiumStatus {
  tier: PremiumTier | null;
  stakedMedals: number;
  isPremium: boolean;
  nextTier: {
    tier: PremiumTier;
    threshold: number;
    needed: number;
  } | null;
  progress: number;
  tierInfo: typeof PREMIUM_TIER_INFO[PremiumTier] | null;
}

/**
 * Get complete premium status for a user
 * @param stakedMedals - Amount of MEDALS staked
 * @returns Complete premium status object
 */
export function getPremiumStatus(stakedMedals: number): PremiumStatus {
  const tier = getPremiumTier(stakedMedals);
  const nextTier = getNextTier(stakedMedals);
  const progress = getTierProgress(stakedMedals);

  return {
    tier,
    stakedMedals,
    isPremium: tier !== null,
    nextTier,
    progress,
    tierInfo: tier ? PREMIUM_TIER_INFO[tier] : null,
  };
}
