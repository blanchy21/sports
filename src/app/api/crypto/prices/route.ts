import { NextRequest, NextResponse } from 'next/server';

// Cache for price data to avoid excessive API calls
interface PriceCache {
  data: any | null;
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
let priceCache: PriceCache = {
  data: null,
  timestamp: 0,
  expiresAt: 0
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    
    // Check if we have valid cached data
    const now = Date.now();
    if (priceCache.data && now < priceCache.expiresAt) {
      console.log('[API] Returning cached price data');
      return NextResponse.json({
        success: true,
        data: priceCache.data,
        cached: true,
        timestamp: priceCache.timestamp
      });
    }

    console.log(`[API] Fetching fresh price data for type: ${type}`);
    
    let priceData;
    
    if (type === 'bitcoin') {
      // Fetch Bitcoin price
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Sportsblock/1.0'
          },
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
      // Fetch HIVE and HBD prices
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=hive,hive_dollar&vs_currencies=usd&include_24hr_change=true',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Sportsblock/1.0'
          },
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
      // Fetch all prices
      const [bitcoinResponse, hiveResponse] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true', {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Sportsblock/1.0' }
        }),
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=hive,hive_dollar&vs_currencies=usd&include_24hr_change=true', {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Sportsblock/1.0' }
        })
      ]);

      if (!bitcoinResponse.ok || !hiveResponse.ok) {
        throw new Error(`CoinGecko API error: Bitcoin ${bitcoinResponse.status}, HIVE/HBD ${hiveResponse.status}`);
      }

      const [bitcoinResult, hiveResult] = await Promise.all([
        bitcoinResponse.json(),
        hiveResponse.json()
      ]);

      priceData = {
        bitcoin: {
          usd: bitcoinResult.bitcoin?.usd || 0,
          usd_24h_change: bitcoinResult.bitcoin?.usd_24h_change,
          market_cap: bitcoinResult.bitcoin?.usd_market_cap,
        },
        hive: {
          usd: hiveResult.hive?.usd || 0,
          usd_24h_change: hiveResult.hive?.usd_24h_change,
        },
        hive_dollar: {
          usd: hiveResult.hive_dollar?.usd || 0,
          usd_24h_change: hiveResult.hive_dollar?.usd_24h_change,
        },
      };
    }

    // Update cache
    priceCache = {
      data: priceData,
      timestamp: now,
      expiresAt: now + CACHE_DURATION
    };

    console.log('[API] Price data fetched and cached:', priceData);
    
    return NextResponse.json({
      success: true,
      data: priceData,
      cached: false,
      timestamp: now
    });

  } catch (error) {
    console.error('[API] Error fetching cryptocurrency prices:', error);
    
    // If we have cached data, return it even if expired
    if (priceCache.data) {
      console.log('[API] Returning expired cached data due to error');
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
