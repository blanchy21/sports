import { NextRequest, NextResponse } from 'next/server';
import { retryWithBackoff } from '@/lib/utils/api-retry';

// Cache for price data to avoid excessive API calls
interface PriceCache {
  data: {
    bitcoin?: { usd: number; usd_24h_change?: number; market_cap?: number };
    ethereum?: { usd: number; usd_24h_change?: number; market_cap?: number };
    hive?: { usd: number; usd_24h_change?: number };
    hive_dollar?: { usd: number; usd_24h_change?: number };
  } | null;
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
let priceCache: PriceCache = {
  data: null,
  timestamp: 0,
  expiresAt: 0
};

const ROUTE = '/api/crypto/prices';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
  const url = request.url;

  console.log(`[${ROUTE}] Request started`, {
    requestId,
    url,
    timestamp: new Date().toISOString()
  });

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    
    // Check if we have valid cached data
    const now = Date.now();
    if (priceCache.data && now < priceCache.expiresAt) {
      return NextResponse.json({
        success: true,
        data: priceCache.data,
        cached: true,
        timestamp: priceCache.timestamp
      });
    }
    
    let priceData;
    
    if (type === 'bitcoin') {
      // Fetch Bitcoin price with retry logic
      const response = await retryWithBackoff(
        () => fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Sportsblock/1.0'
            },
          }
        ),
        {
          maxRetries: 3,
          initialDelay: 2000, // Start with 2 seconds for rate limits
          maxDelay: 30000,
          backoffMultiplier: 2,
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      priceData = {
        bitcoin: {
          usd: data.bitcoin?.usd || 0,
          usd_24h_change: data.bitcoin?.usd_24h_change,
          market_cap: data.bitcoin?.usd_market_cap,
        }
      };
    } else if (type === 'hive') {
      // Fetch HIVE and HBD prices with retry logic
      const response = await retryWithBackoff(
        () => fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=hive,hive_dollar&vs_currencies=usd&include_24hr_change=true',
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Sportsblock/1.0'
            },
          }
        ),
        {
          maxRetries: 3,
          initialDelay: 2000,
          maxDelay: 30000,
          backoffMultiplier: 2,
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      priceData = {
        hive: {
          usd: data.hive?.usd || 0,
          usd_24h_change: data.hive?.usd_24h_change,
        },
        hive_dollar: {
          usd: data.hive_dollar?.usd || 0,
          usd_24h_change: data.hive_dollar?.usd_24h_change,
        }
      };
    } else {
      // Fetch all prices in a SINGLE API call to avoid rate limits
      const response = await retryWithBackoff(
        () => fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,hive,hive_dollar&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
          {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Sportsblock/1.0' }
          }
        ),
        {
          maxRetries: 2,
          initialDelay: 3000, // Longer delay for rate limit recovery
          maxDelay: 30000,
          backoffMultiplier: 2,
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      priceData = {
        bitcoin: {
          usd: data.bitcoin?.usd || 0,
          usd_24h_change: data.bitcoin?.usd_24h_change,
          market_cap: data.bitcoin?.usd_market_cap,
        },
        ethereum: {
          usd: data.ethereum?.usd || 0,
          usd_24h_change: data.ethereum?.usd_24h_change,
          market_cap: data.ethereum?.usd_market_cap,
        },
        hive: {
          usd: data.hive?.usd || 0,
          usd_24h_change: data.hive?.usd_24h_change,
        },
        hive_dollar: {
          usd: data.hive_dollar?.usd || 0,
          usd_24h_change: data.hive_dollar?.usd_24h_change,
        },
      };
    }

    // Update cache
    priceCache = {
      data: priceData,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    };

    
    return NextResponse.json({
      success: true,
      data: priceData,
      cached: false,
      timestamp: now
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${ROUTE}] Request failed after ${duration}ms`, {
      requestId,
      url,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error),
      timestamp: new Date().toISOString()
    });

    // If we have cached data, return it even if expired
    if (priceCache.data) {
      console.log(`[${ROUTE}] Returning expired cached data due to error`);
      return NextResponse.json({
        success: true,
        data: priceCache.data,
        cached: true,
        expired: true,
        timestamp: priceCache.timestamp,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Failed to fetch cryptocurrency prices'
    }, { status: 500 });
  }
}
