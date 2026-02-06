'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PriceContextType } from '@/types';
import { fetchAllPrices, getCachedPrices } from '@/lib/crypto/prices';
import { logger } from '@/lib/logger';

const PriceContext = createContext<PriceContextType | undefined>(undefined);

// Minimum time between fetches (1 minute) to prevent refetch on navigation
const MIN_FETCH_INTERVAL = 60 * 1000;

interface PriceProviderProps {
  children: React.ReactNode;
}

export function PriceProvider({ children }: PriceProviderProps) {
  const [bitcoinPrice, setBitcoinPrice] = useState<number | null>(null);
  const [ethereumPrice, setEthereumPrice] = useState<number | null>(null);
  const [hivePrice, setHivePrice] = useState<number | null>(null);
  const [hbdPrice, setHbdPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track last fetch time to prevent unnecessary refetches
  const lastFetchTimeRef = useRef<number>(0);
  const hasFetchedRef = useRef(false);

  const refreshPrices = useCallback(async (force = false) => {
    // Skip if recently fetched (unless forced)
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const priceData = await fetchAllPrices();

      setBitcoinPrice(priceData.bitcoin.usd);
      setEthereumPrice(priceData.ethereum.usd);
      setHivePrice(priceData.hive.usd);
      setHbdPrice(priceData.hive_dollar.usd);
      setLastUpdated(new Date());
      lastFetchTimeRef.current = now;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Error refreshing prices', 'PriceContext', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load cached prices on mount
  useEffect(() => {
    const cachedPrices = getCachedPrices();
    if (cachedPrices) {
      setBitcoinPrice(cachedPrices.bitcoin.usd);
      setEthereumPrice(cachedPrices.ethereum.usd);
      setHivePrice(cachedPrices.hive.usd);
      setHbdPrice(cachedPrices.hive_dollar.usd);
      setLastUpdated(new Date());
      // Mark as having data so we don't immediately refetch
      lastFetchTimeRef.current = Date.now();
    }
  }, []);

  // Auto-refresh prices every 10 minutes
  useEffect(() => {
    // Only fetch on initial mount if we haven't already
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      refreshPrices();
    }

    // Set up interval for auto-refresh (force refresh)
    const interval = setInterval(
      () => {
        refreshPrices(true);
      },
      10 * 60 * 1000
    ); // 10 minutes

    return () => {
      clearInterval(interval);
    };
  }, [refreshPrices]);

  const value: PriceContextType = {
    bitcoinPrice,
    ethereumPrice,
    hivePrice,
    hbdPrice,
    isLoading,
    error,
    lastUpdated,
    refreshPrices,
  };

  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
}

export function usePriceContext(): PriceContextType {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePriceContext must be used within a PriceProvider');
  }
  return context;
}
