/**
 * React Query hooks for HIVE Power operations
 *
 * These hooks interact with the /api/hive/power route
 * to manage HIVE Power (staking) operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBroadcast } from '@/hooks/useBroadcast';
import { STALE_TIMES } from '@/lib/constants/cache';

// Types for power data
export interface PowerInfo {
  account: string;
  liquidHive: string;
  hivePower: string;
  effectiveHivePower: string;
  delegatedOut: string;
  delegatedIn: string;
  vestingShares: string;
  powerDown: {
    isActive: boolean;
    weeklyAmount?: string;
    weeklyVests?: string;
    remainingAmount?: string;
    remainingVests?: string;
    weeksRemaining?: number;
    nextWithdrawal?: string;
  };
  conversionRate: {
    vestsPerHive: string;
    hivePerVest: string;
  };
  timestamp: string;
}

interface PowerOperation {
  account: string;
  action: 'powerUp' | 'powerDown' | 'cancelPowerDown';
  amount?: number; // Required for powerUp and powerDown
  to?: string; // Optional recipient for powerUp (defaults to self)
}

// Query key factory
export const powerKeys = {
  all: ['hivePower'] as const,
  info: (account: string) => [...powerKeys.all, 'info', account] as const,
};

// API fetch functions
async function fetchPowerInfo(account: string): Promise<PowerInfo> {
  const response = await fetch(`/api/hive/power?account=${encodeURIComponent(account)}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch power info');
  }
  return response.json();
}

/**
 * Hook to fetch HIVE Power information for an account
 */
export function useHivePowerInfo(account: string | undefined) {
  return useQuery({
    queryKey: powerKeys.info(account || ''),
    queryFn: () => fetchPowerInfo(account!),
    enabled: !!account,
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes (HP changes infrequently)
  });
}

/**
 * Hook for power up/down mutations
 * Signs and broadcasts operations using the wallet
 */
export function useHivePowerMutation() {
  const queryClient = useQueryClient();
  const { broadcast } = useBroadcast();

  return useMutation({
    mutationFn: async (operation: PowerOperation) => {
      // Step 1: Build the operation via API
      const response = await fetch('/api/hive/power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to build power operation');
      }

      const data = await response.json();

      if (!data.success || !data.operation) {
        throw new Error(data.error || 'Failed to build power operation');
      }

      // Step 2: Sign and broadcast via unified broadcast
      const operationType = data.operationType;
      const operations: [string, Record<string, unknown>][] = [[operationType, data.operation]];

      // Power operations use active key
      const result = await broadcast(operations, 'active');

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      return {
        success: true,
        transactionId: result.transactionId,
        action: data.action,
        message: data.message,
      };
    },
    onSuccess: (_, variables) => {
      // Invalidate power info query to refresh data
      queryClient.invalidateQueries({ queryKey: powerKeys.info(variables.account) });
      // Also invalidate any general account queries if they exist
      queryClient.invalidateQueries({ queryKey: ['account', variables.account] });
    },
  });
}

/**
 * Convenience hook for power up operation
 */
export function usePowerUp() {
  const mutation = useHivePowerMutation();

  return {
    ...mutation,
    powerUp: (account: string, amount: number, to?: string) =>
      mutation.mutateAsync({
        account,
        action: 'powerUp',
        amount,
        to,
      }),
  };
}

/**
 * Convenience hook for power down operation
 */
export function usePowerDown() {
  const mutation = useHivePowerMutation();

  return {
    ...mutation,
    powerDown: (account: string, amount: number) =>
      mutation.mutateAsync({
        account,
        action: 'powerDown',
        amount,
      }),
  };
}

/**
 * Convenience hook for canceling power down
 */
export function useCancelPowerDown() {
  const mutation = useHivePowerMutation();

  return {
    ...mutation,
    cancelPowerDown: (account: string) =>
      mutation.mutateAsync({
        account,
        action: 'cancelPowerDown',
      }),
  };
}

/**
 * Calculate estimated weekly power down amount
 */
export function calculateWeeklyPowerDown(totalHivePower: number): number {
  // Power down occurs over 13 weeks
  return totalHivePower / 13;
}

/**
 * Format time until next power down withdrawal
 */
export function formatNextWithdrawal(nextWithdrawal: string | undefined): string {
  if (!nextWithdrawal) return 'N/A';

  const next = new Date(nextWithdrawal);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();

  if (diffMs <= 0) return 'Ready to claim';

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}
