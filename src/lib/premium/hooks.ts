/**
 * Premium Status React Hooks
 *
 * Provides React hooks for accessing premium status and features.
 * Uses React Query for caching staked balance data.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  PremiumTier,
  PremiumStatus,
  getPremiumStatus,
  getPremiumTier,
  PREMIUM_TIER_INFO,
} from './checker';
import {
  PremiumFeature,
  hasFeature,
  getAvailableFeatures,
  shouldShowAds,
} from './features';

/**
 * Fetch staked MEDALS balance for an account
 */
async function fetchStakedBalance(account: string): Promise<number> {
  const response = await fetch(`/api/hive-engine/balance?account=${account}`);
  if (!response.ok) {
    throw new Error('Failed to fetch MEDALS balance');
  }
  const data = await response.json();
  return parseFloat(data.staked || '0');
}

/**
 * Hook to get staked MEDALS balance for an account
 * @param account - Hive username
 * @returns Query result with staked balance
 */
export function useStakedBalance(account: string | undefined) {
  return useQuery({
    queryKey: ['medals', 'staked', account],
    queryFn: () => fetchStakedBalance(account!),
    enabled: !!account,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get complete premium status for an account
 * @param account - Hive username
 * @returns Premium status object with loading/error states
 */
export function usePremiumStatus(account: string | undefined): {
  status: PremiumStatus | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data: stakedBalance, isLoading, error, refetch } = useStakedBalance(account);

  const status = useMemo(() => {
    if (stakedBalance === undefined) return null;
    return getPremiumStatus(stakedBalance);
  }, [stakedBalance]);

  return {
    status,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to get premium tier for an account
 * @param account - Hive username
 * @returns Premium tier or null
 */
export function usePremiumTier(account: string | undefined): {
  tier: PremiumTier | null;
  isLoading: boolean;
  tierInfo: typeof PREMIUM_TIER_INFO[PremiumTier] | null;
} {
  const { data: stakedBalance, isLoading } = useStakedBalance(account);

  const tier = useMemo(() => {
    if (stakedBalance === undefined) return null;
    return getPremiumTier(stakedBalance);
  }, [stakedBalance]);

  const tierInfo = tier ? PREMIUM_TIER_INFO[tier] : null;

  return { tier, isLoading, tierInfo };
}

/**
 * Hook to check if user has a specific premium feature
 * @param account - Hive username
 * @param feature - Feature to check
 * @returns True if user has the feature
 */
export function useHasFeature(account: string | undefined, feature: PremiumFeature): {
  hasAccess: boolean;
  isLoading: boolean;
} {
  const { data: stakedBalance, isLoading } = useStakedBalance(account);

  const hasAccess = useMemo(() => {
    if (stakedBalance === undefined) return false;
    return hasFeature(stakedBalance, feature);
  }, [stakedBalance, feature]);

  return { hasAccess, isLoading };
}

/**
 * Hook to get all available features for an account
 * @param account - Hive username
 * @returns Array of available features
 */
export function useAvailableFeatures(account: string | undefined): {
  features: PremiumFeature[];
  isLoading: boolean;
} {
  const { data: stakedBalance, isLoading } = useStakedBalance(account);

  const features = useMemo(() => {
    if (stakedBalance === undefined) return [];
    return getAvailableFeatures(stakedBalance);
  }, [stakedBalance]);

  return { features, isLoading };
}

/**
 * Hook to determine if ads should be shown
 * Returns true while loading to prevent flash of ads for premium users
 * @param account - Hive username
 * @returns True if ads should be shown
 */
export function useShouldShowAds(account: string | undefined): {
  showAds: boolean;
  isLoading: boolean;
} {
  const { data: stakedBalance, isLoading } = useStakedBalance(account);

  const showAds = useMemo(() => {
    // Don't show ads while loading (to prevent flash)
    if (isLoading || stakedBalance === undefined) return false;
    return shouldShowAds(stakedBalance);
  }, [stakedBalance, isLoading]);

  return { showAds, isLoading };
}

/**
 * Hook to check if user is premium (any tier)
 * @param account - Hive username
 * @returns True if user has any premium tier
 */
export function useIsPremium(account: string | undefined): {
  isPremium: boolean;
  isLoading: boolean;
} {
  const { tier, isLoading } = usePremiumTier(account);

  return {
    isPremium: tier !== null,
    isLoading,
  };
}
