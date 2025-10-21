import { CryptoPriceData } from '@/types';

// Cache for price data to avoid excessive API calls
interface PriceCache {
  data: CryptoPriceData | null;
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
let priceCache: PriceCache = {
  data: null,
  timestamp: 0,
  expiresAt: 0
};

/**
 * Fetch Bitcoin price from our API route
 * @returns Bitcoin price in USD
 */
export async function fetchBitcoinPrice(): Promise<number> {
  try {
    
    const response = await fetch('/api/crypto/prices?type=bitcoin', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch Bitcoin price');
    }
    
    return result.data.bitcoin?.usd || 0;
  } catch (error) {
    console.error('[fetchBitcoinPrice] Error fetching Bitcoin price:', error);
    throw new Error(`Failed to fetch Bitcoin price: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch HIVE and HBD prices from our API route
 * @returns Object containing HIVE and HBD prices in USD
 */
export async function fetchHivePrices(): Promise<{
  hive: number;
  hbd: number;
  hive24hChange?: number;
  hbd24hChange?: number;
}> {
  try {
    
    const response = await fetch('/api/crypto/prices?type=hive', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch HIVE/HBD prices');
    }
    
    return {
      hive: result.data.hive?.usd || 0,
      hbd: result.data.hive_dollar?.usd || 0,
      hive24hChange: result.data.hive?.usd_24h_change,
      hbd24hChange: result.data.hive_dollar?.usd_24h_change,
    };
  } catch (error) {
    console.error('[fetchHivePrices] Error fetching HIVE/HBD prices:', error);
    throw new Error(`Failed to fetch HIVE/HBD prices: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch all cryptocurrency prices (Bitcoin, HIVE, HBD) with caching
 * @returns Complete price data
 */
export async function fetchAllPrices(): Promise<CryptoPriceData> {
  try {
    // Check if we have valid cached data
    const now = Date.now();
    if (priceCache.data && now < priceCache.expiresAt) {
      return priceCache.data;
    }

    
    // Fetch all prices from our API route
    const response = await fetch('/api/crypto/prices?type=all', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[fetchAllPrices] Price data from API:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch cryptocurrency prices');
    }

    const priceData: CryptoPriceData = result.data;

    // Update cache
    priceCache = {
      data: priceData,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    };

    return priceData;
  } catch (error) {
    console.error('[fetchAllPrices] Error fetching all prices:', error);
    
    // If we have cached data, return it even if expired
    if (priceCache.data) {
      console.log('[fetchAllPrices] Returning expired cached data due to error');
      return priceCache.data;
    }
    
    throw new Error(`Failed to fetch cryptocurrency prices: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Clear the price cache (useful for testing or manual refresh)
 */
export function clearPriceCache(): void {
  priceCache = {
    data: null,
    timestamp: 0,
    expiresAt: 0
  };
  console.log('[clearPriceCache] Price cache cleared');
}

/**
 * Get cached price data without making API calls
 * @returns Cached price data or null if not available
 */
export function getCachedPrices(): CryptoPriceData | null {
  const now = Date.now();
  if (priceCache.data && now < priceCache.expiresAt) {
    return priceCache.data;
  }
  return null;
}
