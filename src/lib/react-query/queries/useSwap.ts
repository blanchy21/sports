/**
 * React Query hooks for HIVE -> MEDALS swap
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { queryKeys } from '../queryClient';
import { useBroadcast } from '@/hooks/useBroadcast';
import { buildSwapOperations } from '@/lib/hive-engine/swap';
import { logger } from '@/lib/logger';
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

interface OpenOrdersResponse {
  openOrders: Array<{
    price: string;
    quantity: string;
    timestamp: number;
    txId: string;
  }>;
  count: number;
}

async function fetchOpenOrders(account: string): Promise<OpenOrdersResponse> {
  const response = await fetch(`/api/hive-engine/open-orders?account=${account}&symbol=MEDALS`);
  if (!response.ok) {
    throw new Error('Failed to check open orders');
  }
  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch a swap quote for a given HIVE amount.
 * Debounced via the `amount` key -- only fires when amount > 0.
 */
export function useSwapQuote(amount: number) {
  return useQuery({
    queryKey: queryKeys.medals.swap(amount),
    queryFn: () => fetchSwapQuote(amount),
    enabled: amount > 0,
    staleTime: 15_000, // 15s -- order book changes fast
    refetchOnWindowFocus: true,
  });
}

interface SwapParams {
  username: string;
  fee: number;
  netHive: number;
}

/**
 * Mutation: execute HIVE -> MEDALS swap (fee + deposit + market buy in one tx).
 */
export function useSwapMedals() {
  const queryClient = useQueryClient();
  const { broadcast } = useBroadcast();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      const { username, fee, netHive } = params;

      const operations = buildSwapOperations(username, fee, netHive);

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

// ============================================================================
// Post-swap verification
// ============================================================================

export type SwapVerifyStatus = 'idle' | 'verifying' | 'filled' | 'open_order' | 'error';

/**
 * Hook to verify whether a swap order actually filled on Hive Engine.
 *
 * After broadcast succeeds, call `verify(account)` to poll the sidechain.
 * Hive Engine processes blocks every ~3s, so we wait before checking.
 */
export function useVerifySwap() {
  const [status, setStatus] = useState<SwapVerifyStatus>('idle');
  const [openOrderCount, setOpenOrderCount] = useState(0);

  const verify = useCallback(async (account: string) => {
    setStatus('verifying');
    setOpenOrderCount(0);

    try {
      // Wait for Hive Engine sidechain to process (typically 3-6 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const data = await fetchOpenOrders(account);

      if (data.count > 0) {
        setOpenOrderCount(data.count);
        setStatus('open_order');
      } else {
        setStatus('filled');
      }
    } catch (error) {
      logger.error('Failed to verify swap', 'useVerifySwap', error);
      // If verification fails, assume filled but warn
      setStatus('filled');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setOpenOrderCount(0);
  }, []);

  return { status, openOrderCount, verify, reset };
}
