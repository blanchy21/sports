/**
 * Hive Engine Market Data
 *
 * Functions for fetching market data from Tribaldex and Hive Engine.
 */

import { getHiveEngineClient, parseQuantity } from './client';
import { MEDALS_CONFIG, TRIBALDEX_CONFIG, CONTRACTS } from './constants';
import type { MarketData, OrderBook, OrderBookEntry, PoolInfo } from './types';

// ============================================================================
// Market Data Fetching
// ============================================================================

/**
 * Get market metrics for a token from Tribaldex
 */
export async function getMarketMetrics(
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<MarketData | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRIBALDEX_CONFIG.REQUEST_TIMEOUT);

    const response = await fetch(
      `${TRIBALDEX_CONFIG.API_URL}${TRIBALDEX_CONFIG.ENDPOINTS.METRICS}/${symbol}`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      symbol,
      priceHive: parseFloat(data.lastPrice) || 0,
      priceChange24h: parseFloat(data.priceChangePercent) || 0,
      volume24h: parseFloat(data.volume) || 0,
      highestBid: parseFloat(data.highestBid) || 0,
      lowestAsk: parseFloat(data.lowestAsk) || 0,
      lastPrice: parseFloat(data.lastPrice) || 0,
      marketCap: parseFloat(data.marketCap) || 0,
    };
  } catch (error) {
    console.error('[HiveEngine] Failed to fetch market metrics:', error);
    return null;
  }
}

/**
 * Get market data from Hive Engine directly (fallback)
 */
export async function getMarketDataFromHiveEngine(
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<MarketData | null> {
  try {
    const client = getHiveEngineClient();

    // Get buy orders (highest bid)
    const buyOrders = await client.find<OrderBookEntry>(
      CONTRACTS.MARKET,
      'buyBook',
      { symbol },
      { limit: 1, index: 'price', descending: true }
    );

    // Get sell orders (lowest ask)
    const sellOrders = await client.find<OrderBookEntry>(
      CONTRACTS.MARKET,
      'sellBook',
      { symbol },
      { limit: 1, index: 'price', descending: false }
    );

    // Get recent trades for volume
    const trades = await client.find<{ price: string; quantity: string; timestamp: number }>(
      CONTRACTS.MARKET,
      'tradesHistory',
      { symbol },
      { limit: 100, index: 'timestamp', descending: true }
    );

    // Calculate 24h volume
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentTrades = trades.filter((t) => t.timestamp * 1000 > oneDayAgo);
    const volume24h = recentTrades.reduce(
      (sum, t) => sum + parseQuantity(t.price) * parseQuantity(t.quantity),
      0
    );

    const highestBid = buyOrders.length > 0 ? parseQuantity(buyOrders[0].price) : 0;
    const lowestAsk = sellOrders.length > 0 ? parseQuantity(sellOrders[0].price) : 0;
    const lastPrice = trades.length > 0 ? parseQuantity(trades[0].price) : 0;

    return {
      symbol,
      priceHive: lastPrice || (highestBid + lowestAsk) / 2,
      priceChange24h: 0, // Would need historical data to calculate
      volume24h,
      highestBid,
      lowestAsk,
      lastPrice,
      marketCap: 0, // Would need supply data
    };
  } catch (error) {
    console.error('[HiveEngine] Failed to fetch market data from Hive Engine:', error);
    return null;
  }
}

/**
 * Get market data (tries Tribaldex first, falls back to Hive Engine)
 */
export async function getMarketData(
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<MarketData | null> {
  // Try Tribaldex first
  const tribaldexData = await getMarketMetrics(symbol);
  if (tribaldexData) {
    return tribaldexData;
  }

  // Fall back to Hive Engine
  return getMarketDataFromHiveEngine(symbol);
}

// ============================================================================
// Order Book
// ============================================================================

/**
 * Get order book for a token
 */
export async function getOrderBook(
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 50
): Promise<OrderBook> {
  const client = getHiveEngineClient();

  const [buyOrders, sellOrders] = await Promise.all([
    client.find<OrderBookEntry>(
      CONTRACTS.MARKET,
      'buyBook',
      { symbol },
      { limit, index: 'price', descending: true }
    ),
    client.find<OrderBookEntry>(
      CONTRACTS.MARKET,
      'sellBook',
      { symbol },
      { limit, index: 'price', descending: false }
    ),
  ]);

  return {
    bids: buyOrders,
    asks: sellOrders,
  };
}

/**
 * Get aggregated order book with price levels
 */
export async function getAggregatedOrderBook(
  symbol: string = MEDALS_CONFIG.SYMBOL,
  limit: number = 20
): Promise<{
  bids: Array<{ price: number; quantity: number; total: number }>;
  asks: Array<{ price: number; quantity: number; total: number }>;
}> {
  const orderBook = await getOrderBook(symbol, limit * 5);

  // Aggregate bids by price
  const bidMap = new Map<number, number>();
  orderBook.bids.forEach((order) => {
    const price = Math.floor(parseQuantity(order.price) * 10000) / 10000;
    const qty = parseQuantity(order.quantity);
    bidMap.set(price, (bidMap.get(price) || 0) + qty);
  });

  // Aggregate asks by price
  const askMap = new Map<number, number>();
  orderBook.asks.forEach((order) => {
    const price = Math.ceil(parseQuantity(order.price) * 10000) / 10000;
    const qty = parseQuantity(order.quantity);
    askMap.set(price, (askMap.get(price) || 0) + qty);
  });

  // Convert to sorted arrays with running totals
  const bids = Array.from(bidMap.entries())
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .reduce(
      (acc, [price, quantity]) => {
        const total = (acc.length > 0 ? acc[acc.length - 1].total : 0) + quantity;
        acc.push({ price, quantity, total });
        return acc;
      },
      [] as Array<{ price: number; quantity: number; total: number }>
    );

  const asks = Array.from(askMap.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, limit)
    .reduce(
      (acc, [price, quantity]) => {
        const total = (acc.length > 0 ? acc[acc.length - 1].total : 0) + quantity;
        acc.push({ price, quantity, total });
        return acc;
      },
      [] as Array<{ price: number; quantity: number; total: number }>
    );

  return { bids, asks };
}

// ============================================================================
// Liquidity Pools
// ============================================================================

/**
 * Get liquidity pool info for a token pair
 */
export async function getPoolInfo(
  baseSymbol: string,
  quoteSymbol: string = 'SWAP.HIVE'
): Promise<PoolInfo | null> {
  const client = getHiveEngineClient();

  const tokenPair = `${baseSymbol}:${quoteSymbol}`;

  const pool = await client.findOne<{
    tokenPair: string;
    baseQuantity: string;
    quoteQuantity: string;
    basePrice: string;
    quotePrice: string;
    totalShares: string;
  }>(CONTRACTS.MARKETPOOLS, 'pools', { tokenPair });

  if (!pool) {
    // Try reverse pair
    const reversePair = `${quoteSymbol}:${baseSymbol}`;
    const reversePool = await client.findOne<{
      tokenPair: string;
      baseQuantity: string;
      quoteQuantity: string;
      basePrice: string;
      quotePrice: string;
      totalShares: string;
    }>(CONTRACTS.MARKETPOOLS, 'pools', { tokenPair: reversePair });

    if (!reversePool) {
      return null;
    }

    return {
      tokenPair: reversePool.tokenPair,
      baseSymbol: quoteSymbol,
      quoteSymbol: baseSymbol,
      baseQuantity: parseQuantity(reversePool.baseQuantity),
      quoteQuantity: parseQuantity(reversePool.quoteQuantity),
      totalLiquidity: parseQuantity(reversePool.quoteQuantity) * 2,
      basePrice: parseQuantity(reversePool.basePrice),
    };
  }

  return {
    tokenPair: pool.tokenPair,
    baseSymbol,
    quoteSymbol,
    baseQuantity: parseQuantity(pool.baseQuantity),
    quoteQuantity: parseQuantity(pool.quoteQuantity),
    totalLiquidity: parseQuantity(pool.quoteQuantity) * 2,
    basePrice: parseQuantity(pool.basePrice),
  };
}

/**
 * Get MEDALS liquidity pool info
 */
export async function getMedalsPoolInfo(): Promise<PoolInfo | null> {
  return getPoolInfo(MEDALS_CONFIG.SYMBOL, 'SWAP.HIVE');
}

// ============================================================================
// Price Calculations
// ============================================================================

/**
 * Calculate HIVE value of a token amount
 */
export async function calculateHiveValue(
  amount: number,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<number> {
  const marketData = await getMarketData(symbol);
  if (!marketData) {
    return 0;
  }
  return amount * marketData.priceHive;
}

/**
 * Calculate token amount from HIVE value
 */
export async function calculateTokenAmount(
  hiveAmount: number,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<number> {
  const marketData = await getMarketData(symbol);
  if (!marketData || marketData.priceHive === 0) {
    return 0;
  }
  return hiveAmount / marketData.priceHive;
}

/**
 * Get price impact for a trade
 */
export async function calculatePriceImpact(
  amount: number,
  isBuy: boolean,
  symbol: string = MEDALS_CONFIG.SYMBOL
): Promise<{
  averagePrice: number;
  priceImpact: number;
  worstPrice: number;
}> {
  const orderBook = await getOrderBook(symbol, 100);
  const orders = isBuy ? orderBook.asks : orderBook.bids;

  let remainingAmount = amount;
  let totalCost = 0;
  let worstPrice = 0;

  for (const order of orders) {
    const orderQty = parseQuantity(order.quantity);
    const orderPrice = parseQuantity(order.price);

    const fillQty = Math.min(remainingAmount, orderQty);
    totalCost += fillQty * orderPrice;
    remainingAmount -= fillQty;
    worstPrice = orderPrice;

    if (remainingAmount <= 0) break;
  }

  if (remainingAmount > 0) {
    // Not enough liquidity
    return {
      averagePrice: 0,
      priceImpact: 100,
      worstPrice: 0,
    };
  }

  const averagePrice = totalCost / amount;
  const marketData = await getMarketData(symbol);
  const currentPrice = marketData?.lastPrice || averagePrice;
  const priceImpact = Math.abs((averagePrice - currentPrice) / currentPrice) * 100;

  return {
    averagePrice,
    priceImpact,
    worstPrice,
  };
}

// ============================================================================
// Market Statistics
// ============================================================================

/**
 * Get comprehensive market statistics
 */
export async function getMarketStats(symbol: string = MEDALS_CONFIG.SYMBOL): Promise<{
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  spread: number;
  spreadPercent: number;
} | null> {
  const [marketData, poolInfo] = await Promise.all([
    getMarketData(symbol),
    getPoolInfo(symbol),
  ]);

  if (!marketData) {
    return null;
  }

  const spread = marketData.lowestAsk - marketData.highestBid;
  const midPrice = (marketData.lowestAsk + marketData.highestBid) / 2;
  const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

  return {
    price: marketData.priceHive,
    priceChange24h: marketData.priceChange24h,
    volume24h: marketData.volume24h,
    marketCap: marketData.marketCap,
    liquidity: poolInfo?.totalLiquidity || 0,
    spread,
    spreadPercent,
  };
}
