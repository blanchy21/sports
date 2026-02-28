/**
 * React Query hooks for MEDALS token operations
 *
 * These hooks interact with the /api/hive-engine/* routes
 * to fetch and manage MEDALS token data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { STALE_TIMES } from '@/lib/constants/cache';
import { useBroadcast } from '@/hooks/useBroadcast';

// Types for MEDALS data
export interface MedalsBalance {
  account: string;
  symbol: string;
  liquid: string;
  staked: string;
  pendingUnstake: string;
  delegatedIn: string;
  delegatedOut: string;
  total: string;
  premiumTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | null;
  estimatedAPY: string;
  hiveValue: string;
  timestamp: string;
}

export interface MedalsStakeInfo {
  account: string;
  symbol: string;
  staked: string;
  pendingUnstake: string;
  pendingUnstakeTransactions: Array<{
    quantity: string;
    completeTimestamp: string;
    remainingMs: number;
  }>;
  delegatedIn: string;
  delegatedOut: string;
  effectiveStake: string;
  delegations: {
    incoming: Array<{ from: string; quantity: string }>;
    outgoing: Array<{ to: string; quantity: string }>;
  };
  estimatedAPY: string;
  estimatedWeeklyReward: string;
  premiumTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | null;
  stakeShare: string;
  totalStakedNetwork: string;
  weeklyRewardPool: string;
  stakingEnabled: boolean;
  unstakingCooldown: number;
  timestamp: string;
}

export interface MedalsMarket {
  symbol: string;
  name: string;
  price: string;
  priceChange24h: string;
  volume24h: string;
  marketCap: string;
  highestBid: string;
  lowestAsk: string;
  lastPrice: string;
  timestamp: string;
  message?: string;
}

export interface MedalsTransaction {
  txId: string;
  type: string;
  timestamp: string;
  from: string;
  to: string;
  quantity: string;
  memo: string;
  symbol: string;
}

export interface MedalsHistory {
  account: string;
  symbol: string;
  transactions: MedalsTransaction[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  timestamp: string;
}

export interface LeaderboardHolder {
  rank: number;
  account: string;
  staked: number;
  liquid: number;
  delegatedIn: number;
  delegatedOut: number;
  total: number;
  premiumTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | null;
}

export interface LeaderboardData {
  holders: LeaderboardHolder[];
  totalHolders: number;
  timestamp: string;
}

// API fetch functions
async function fetchMedalsBalance(account: string): Promise<MedalsBalance> {
  const response = await fetch(`/api/hive-engine/balance?account=${encodeURIComponent(account)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch MEDALS balance');
  }
  return response.json();
}

async function fetchMedalsStake(account: string): Promise<MedalsStakeInfo> {
  const response = await fetch(`/api/hive-engine/stake?account=${encodeURIComponent(account)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stake info');
  }
  return response.json();
}

async function fetchMedalsMarket(): Promise<MedalsMarket> {
  const response = await fetch('/api/hive-engine/market');
  if (!response.ok) {
    throw new Error('Failed to fetch market data');
  }
  return response.json();
}

async function fetchMedalsLeaderboard(): Promise<LeaderboardData> {
  const response = await fetch('/api/hive-engine/leaderboard');
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }
  return response.json();
}

async function fetchMedalsHistory(
  account: string,
  type?: string,
  limit = 20,
  offset = 0
): Promise<MedalsHistory> {
  const params = new URLSearchParams({
    account,
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (type) params.set('type', type);

  const response = await fetch(`/api/hive-engine/history?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch transaction history');
  }
  return response.json();
}

// Query hooks
export function useMedalsBalance(account: string | undefined) {
  return useQuery({
    queryKey: queryKeys.medals.balance(account || ''),
    queryFn: () => fetchMedalsBalance(account!),
    enabled: !!account,
    staleTime: STALE_TIMES.REALTIME,
  });
}

export function useMedalsStake(account: string | undefined) {
  return useQuery({
    queryKey: queryKeys.medals.stake(account || ''),
    queryFn: () => fetchMedalsStake(account!),
    enabled: !!account,
    staleTime: STALE_TIMES.REALTIME,
  });
}

export function useMedalsLeaderboard() {
  return useQuery({
    queryKey: queryKeys.medals.leaderboard(),
    queryFn: fetchMedalsLeaderboard,
    staleTime: STALE_TIMES.STANDARD,
  });
}

export function useMedalsMarket() {
  return useQuery({
    queryKey: queryKeys.medals.market(),
    queryFn: fetchMedalsMarket,
    staleTime: STALE_TIMES.STANDARD,
  });
}

export function useMedalsHistory(
  account: string | undefined,
  type?: string,
  limit = 20,
  offset = 0
) {
  return useQuery({
    queryKey: [...queryKeys.medals.history(account || ''), type, limit, offset],
    queryFn: () => fetchMedalsHistory(account!, type, limit, offset),
    enabled: !!account,
    staleTime: STALE_TIMES.REALTIME,
  });
}

// Mutation hooks for stake/unstake/transfer operations
interface StakeOperation {
  account: string;
  action: 'stake' | 'unstake' | 'cancelUnstake';
  quantity: string;
  transactionId?: string;
}

interface TransferOperation {
  from: string;
  to: string;
  quantity: string;
  memo?: string;
  action?: 'transfer' | 'delegate' | 'undelegate';
}

export function useStakeMedals() {
  const queryClient = useQueryClient();
  const { broadcast } = useBroadcast();

  return useMutation({
    mutationFn: async (operation: StakeOperation) => {
      // Step 1: Build the operation via API
      const response = await fetch('/api/hive-engine/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to build stake operation');
      }

      const data = await response.json();

      if (!data.success || !data.operation) {
        throw new Error(data.error || 'Failed to build stake operation');
      }

      // Step 2: Sign and broadcast via unified broadcast
      const customJsonOp = data.operation;

      const operations: [string, Record<string, unknown>][] = [
        [
          'custom_json',
          {
            id: customJsonOp.id,
            required_auths: customJsonOp.required_auths,
            required_posting_auths: customJsonOp.required_posting_auths,
            json: customJsonOp.json,
          },
        ],
      ];

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
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.balance(variables.account) });
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.stake(variables.account) });
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.history(variables.account) });
    },
  });
}

export function useTransferMedals() {
  const queryClient = useQueryClient();
  const { broadcast } = useBroadcast();

  return useMutation({
    mutationFn: async (operation: TransferOperation) => {
      // Step 1: Build the operation via API
      const response = await fetch('/api/hive-engine/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to build transfer operation');
      }

      const data = await response.json();

      if (!data.success || !data.operation) {
        throw new Error(data.error || 'Failed to build transfer operation');
      }

      // Step 2: Sign and broadcast via unified broadcast
      const customJsonOp = data.operation;

      const operations: [string, Record<string, unknown>][] = [
        [
          'custom_json',
          {
            id: customJsonOp.id,
            required_auths: customJsonOp.required_auths,
            required_posting_auths: customJsonOp.required_posting_auths,
            json: customJsonOp.json,
          },
        ],
      ];

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
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.balance(variables.from) });
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.history(variables.from) });
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.balance(variables.to) });
    },
  });
}

// Utility hook for invalidating MEDALS queries
export function useInvalidateMedals() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.medals.all }),
    invalidateBalance: (account: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.balance(account) }),
    invalidateStake: (account: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.stake(account) }),
    invalidateHistory: (account: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.history(account) }),
    invalidateMarket: () => queryClient.invalidateQueries({ queryKey: queryKeys.medals.market() }),
  };
}

// Helper to calculate HIVE value from MEDALS balance
export function calculateHiveValue(
  balance: MedalsBalance | undefined,
  market: MedalsMarket | undefined
): string {
  if (!balance || !market) return '0.000';

  const totalMedals = parseFloat(balance.total) || 0;
  const price = parseFloat(market.price) || 0;

  return (totalMedals * price).toFixed(3);
}
