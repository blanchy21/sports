import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { fetchAllPrices } from '@/lib/crypto/prices';
import { STALE_TIMES } from '@/lib/constants/cache';

export function usePrices() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.prices.all,
    queryFn: fetchAllPrices,
    staleTime: STALE_TIMES.STABLE, // 10 minutes
    refetchInterval: 10 * 60 * 1000, // auto-refresh every 10 minutes
  });

  const refreshPrices = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    bitcoinPrice: data?.bitcoin.usd ?? null,
    ethereumPrice: data?.ethereum.usd ?? null,
    hivePrice: data?.hive.usd ?? null,
    hbdPrice: data?.hive_dollar.usd ?? null,
    isLoading,
    error: error?.message ?? null,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    refreshPrices,
  };
}
