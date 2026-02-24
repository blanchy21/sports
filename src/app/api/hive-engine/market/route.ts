/**
 * MEDALS Market Data API Route
 *
 * GET /api/hive-engine/market
 *   Returns market data for MEDALS token
 *
 * GET /api/hive-engine/market?detail=orderbook
 *   Returns order book data
 *
 * GET /api/hive-engine/market?detail=pool
 *   Returns liquidity pool data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/api/response';
import {
  getMarketData,
  getMarketStats,
  getAggregatedOrderBook,
  getMedalsPoolInfo,
  calculatePriceImpact,
} from '@/lib/hive-engine/market';
import { getTokenInfo, getTotalStaked, getTopHolders } from '@/lib/hive-engine/tokens';
import { formatQuantity, parseQuantity } from '@/lib/hive-engine/client';
import { MEDALS_CONFIG, CACHE_TTLS } from '@/lib/hive-engine/constants';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive-engine/market';

export async function GET(request: NextRequest) {
  const ctx = createRequestContext(ROUTE);
  try {
    const { searchParams } = new URL(request.url);
    const detail = searchParams.get('detail');
    const amount = searchParams.get('amount');
    const side = searchParams.get('side') as 'buy' | 'sell' | null;

    switch (detail) {
      case 'orderbook': {
        const orderBook = await getAggregatedOrderBook(MEDALS_CONFIG.SYMBOL, 20);

        return NextResponse.json(
          {
            symbol: MEDALS_CONFIG.SYMBOL,
            bids: orderBook.bids.map((b) => ({
              price: b.price.toFixed(8),
              quantity: formatQuantity(b.quantity),
              total: formatQuantity(b.total),
            })),
            asks: orderBook.asks.map((a) => ({
              price: a.price.toFixed(8),
              quantity: formatQuantity(a.quantity),
              total: formatQuantity(a.total),
            })),
            spread:
              orderBook.asks.length > 0 && orderBook.bids.length > 0
                ? (orderBook.asks[0].price - orderBook.bids[0].price).toFixed(8)
                : '0',
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_TTLS.MARKET_PRICE}, stale-while-revalidate=${CACHE_TTLS.MARKET_PRICE * 2}`,
            },
          }
        );
      }

      case 'pool': {
        const poolInfo = await getMedalsPoolInfo();

        if (!poolInfo) {
          return NextResponse.json(
            {
              symbol: MEDALS_CONFIG.SYMBOL,
              pool: null,
              message: 'No liquidity pool found for this token pair',
              timestamp: new Date().toISOString(),
            },
            {
              headers: {
                'Cache-Control': `public, s-maxage=${CACHE_TTLS.POOL_LIQUIDITY}`,
              },
            }
          );
        }

        return NextResponse.json(
          {
            symbol: MEDALS_CONFIG.SYMBOL,
            pool: {
              tokenPair: poolInfo.tokenPair,
              baseSymbol: poolInfo.baseSymbol,
              quoteSymbol: poolInfo.quoteSymbol,
              baseQuantity: formatQuantity(poolInfo.baseQuantity),
              quoteQuantity: formatQuantity(poolInfo.quoteQuantity),
              totalLiquidity: formatQuantity(poolInfo.totalLiquidity),
              price: poolInfo.basePrice.toFixed(8),
            },
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_TTLS.POOL_LIQUIDITY}`,
            },
          }
        );
      }

      case 'impact': {
        // Calculate price impact for a trade
        if (!amount || !side) {
          return NextResponse.json(
            { error: 'Amount and side (buy/sell) parameters required for price impact' },
            { status: 400 }
          );
        }

        const tradeAmount = parseQuantity(amount);
        if (tradeAmount <= 0) {
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const impact = await calculatePriceImpact(tradeAmount, side === 'buy');

        return NextResponse.json(
          {
            symbol: MEDALS_CONFIG.SYMBOL,
            side,
            amount: formatQuantity(tradeAmount),
            averagePrice: impact.averagePrice.toFixed(8),
            worstPrice: impact.worstPrice.toFixed(8),
            priceImpact: `${impact.priceImpact.toFixed(2)}%`,
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              'Cache-Control': 'no-cache',
            },
          }
        );
      }

      case 'stats': {
        // Detailed token statistics
        const [tokenInfo, marketStats, totalStaked, topHolders] = await Promise.all([
          getTokenInfo(MEDALS_CONFIG.SYMBOL),
          getMarketStats(MEDALS_CONFIG.SYMBOL),
          getTotalStaked(MEDALS_CONFIG.SYMBOL),
          getTopHolders(MEDALS_CONFIG.SYMBOL, 10),
        ]);

        if (!tokenInfo) {
          return NextResponse.json({ error: 'Token not found' }, { status: 404 });
        }

        const circulatingSupply = parseQuantity(tokenInfo.circulatingSupply);
        const maxSupply = parseQuantity(tokenInfo.maxSupply);
        const stakedPercent = circulatingSupply > 0 ? (totalStaked / circulatingSupply) * 100 : 0;

        return NextResponse.json(
          {
            symbol: MEDALS_CONFIG.SYMBOL,
            name: tokenInfo.name,
            issuer: tokenInfo.issuer,
            precision: tokenInfo.precision,
            supply: {
              circulating: formatQuantity(circulatingSupply),
              max: formatQuantity(maxSupply),
              percentMinted: ((circulatingSupply / maxSupply) * 100).toFixed(2),
            },
            staking: {
              totalStaked: formatQuantity(totalStaked),
              stakedPercent: stakedPercent.toFixed(2),
              stakingEnabled: tokenInfo.stakingEnabled,
              unstakingCooldown: `${tokenInfo.unstakingCooldown} days`,
            },
            market: marketStats
              ? {
                  price: marketStats.price.toFixed(8),
                  priceChange24h: `${marketStats.priceChange24h.toFixed(2)}%`,
                  volume24h: formatQuantity(marketStats.volume24h),
                  marketCap: formatQuantity(marketStats.marketCap),
                  liquidity: formatQuantity(marketStats.liquidity),
                  spread: marketStats.spread.toFixed(8),
                  spreadPercent: `${marketStats.spreadPercent.toFixed(2)}%`,
                }
              : null,
            topHolders: topHolders.map((h, i) => ({
              rank: i + 1,
              account: h.account,
              balance: formatQuantity(h.balance),
              stake: formatQuantity(h.stake),
              total: formatQuantity(h.total),
              percentSupply: ((h.total / circulatingSupply) * 100).toFixed(2),
            })),
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_TTLS.TOKEN_INFO}`,
            },
          }
        );
      }

      default: {
        // Default: return basic market data
        const [marketData, tokenInfo] = await Promise.all([
          getMarketData(MEDALS_CONFIG.SYMBOL),
          getTokenInfo(MEDALS_CONFIG.SYMBOL),
        ]);

        if (!marketData) {
          return NextResponse.json(
            {
              symbol: MEDALS_CONFIG.SYMBOL,
              price: '0.00000000',
              priceChange24h: '0.00%',
              volume24h: '0.000',
              marketCap: '0.000',
              message: 'Market data unavailable',
              timestamp: new Date().toISOString(),
            },
            {
              headers: {
                'Cache-Control': `public, s-maxage=${CACHE_TTLS.MARKET_PRICE}`,
              },
            }
          );
        }

        return NextResponse.json(
          {
            symbol: MEDALS_CONFIG.SYMBOL,
            name: tokenInfo?.name || MEDALS_CONFIG.SYMBOL,
            price: marketData.priceHive.toFixed(8),
            priceChange24h: `${marketData.priceChange24h.toFixed(2)}%`,
            volume24h: formatQuantity(marketData.volume24h),
            marketCap: formatQuantity(marketData.marketCap),
            highestBid: marketData.highestBid.toFixed(8),
            lowestAsk: marketData.lowestAsk.toFixed(8),
            lastPrice: marketData.lastPrice.toFixed(8),
            timestamp: new Date().toISOString(),
          },
          {
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_TTLS.MARKET_PRICE}, stale-while-revalidate=${CACHE_TTLS.MARKET_PRICE * 2}`,
            },
          }
        );
      }
    }
  } catch (error) {
    return ctx.handleError(error);
  }
}
