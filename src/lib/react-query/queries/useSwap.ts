/**
 * React Query hooks for HIVE → MEDALS swap
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { useBroadcast } from '@/hooks/useBroadcast';
import { buildSwapOperations } from '@/lib/hive-engine/swap';
import type { SwapQuote } from '@/lib/hive-engine/types';

// ============================================================================
// API fetch
// ============================================================================

interface SwapQuoteResponse {
  hiveAmount: string;
  fee: string;
  netHive: string;
  estimatedMedals: string;
  averagePrice: string;
  worstPrice: string;
  priceImpact: string;
  sufficient: boolean;
  ordersMatched: number;
  timestamp: string;
}

async function fetchSwapQuote(amount: number): Promise<SwapQuote> {
  const response = await fetch(`/api/hive-engine/swap?amount=${amount}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch swap quote');
  }
  const data: SwapQuoteResponse = await response.json();
  return {
    hiveAmount: parseFloat(data.hiveAmount),
    fee: parseFloat(data.fee),
    netHive: parseFloat(data.netHive),
    estimatedMedals: parseFloat(data.estimatedMedals),
    averagePrice: parseFloat(data.averagePrice),
    worstPrice: parseFloat(data.worstPrice),
    priceImpact: parseFloat(data.priceImpact),
    sufficient: data.sufficient,
    ordersMatched: data.ordersMatched,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch a swap quote for a given HIVE amount.
 * Debounced via the `amount` key — only fires when amount > 0.
 */
export function useSwapQuote(amount: number) {
  return useQuery({
    queryKey: queryKeys.medals.swap(amount),
    queryFn: () => fetchSwapQuote(amount),
    enabled: amount > 0,
    staleTime: 15_000, // 15s — order book changes fast
    refetchOnWindowFocus: true,
  });
}

interface SwapParams {
  username: string;
  hiveAmount: number;
  fee: number;
  netHive: number;
  estimatedMedals: number;
  worstPrice: number;
}

/**
 * Mutation: execute HIVE → MEDALS swap (fee + deposit + market buy in one tx).
 */
export function useSwapMedals() {
  const queryClient = useQueryClient();
  const { broadcast } = useBroadcast();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      const { username, hiveAmount, fee, netHive, estimatedMedals, worstPrice } = params;

      const operations = buildSwapOperations(
        username,
        hiveAmount,
        fee,
        netHive,
        estimatedMedals,
        worstPrice
      );

      const result = await broadcast(operations, 'active');

      if (!result.success) {
        throw new Error(result.error || 'Swap transaction failed');
      }

      return {
        success: true as const,
        transactionId: result.transactionId,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.balance(variables.username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.history(variables.username) });
      queryClient.invalidateQueries({ queryKey: queryKeys.medals.market() });
    },
  });
}
