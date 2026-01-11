'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PriceContextType } from '@/types';
import { fetchAllPrices, getCachedPrices } from '@/lib/crypto/prices';

const PriceContext = createContext<PriceContextType | undefined>(undefined);

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

  const refreshPrices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const priceData = await fetchAllPrices();
      
      setBitcoinPrice(priceData.bitcoin.usd);
      setEthereumPrice(priceData.ethereum.usd);
      setHivePrice(priceData.hive.usd);
      setHbdPrice(priceData.hive_dollar.usd);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[PriceContext] Error refreshing prices:', errorMessage);
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
    }
  }, []);

  // Auto-refresh prices every 10 minutes
  useEffect(() => {
    // Initial fetch
    refreshPrices();

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      refreshPrices();
    }, 10 * 60 * 1000); // 10 minutes

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

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePriceContext(): PriceContextType {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePriceContext must be used within a PriceProvider');
  }
  return context;
}
