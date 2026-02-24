/**
 * Tests for /api/hive-engine/market route
 */

/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';
import { GET } from '@/app/api/hive-engine/market/route';

// Mock the hive-engine modules
jest.mock('@/lib/hive-engine/market', () => ({
  getMarketData: jest.fn(),
  getMarketStats: jest.fn(),
  getAggregatedOrderBook: jest.fn(),
  getMedalsPoolInfo: jest.fn(),
  calculatePriceImpact: jest.fn(),
}));

jest.mock('@/lib/hive-engine/tokens', () => ({
  getTokenInfo: jest.fn(),
  getTotalStaked: jest.fn(),
  getTopHolders: jest.fn(),
}));

jest.mock('@/lib/hive-engine/client', () => ({
  formatQuantity: jest.fn((n: number) => n.toFixed(3)),
  parseQuantity: jest.fn((q: string) => parseFloat(q)),
}));

jest.mock('@/lib/hive-engine/constants', () => ({
  MEDALS_CONFIG: {
    SYMBOL: 'MEDALS',
    PRECISION: 3,
  },
  CACHE_TTLS: {
    MARKET_PRICE: 30,
    POOL_LIQUIDITY: 60,
    TOKEN_INFO: 300,
  },
}));

const {
  getMarketData,
  getMarketStats,
  getAggregatedOrderBook,
  getMedalsPoolInfo,
  calculatePriceImpact,
} = jest.requireMock('@/lib/hive-engine/market');

const { getTokenInfo, getTotalStaked, getTopHolders } = jest.requireMock(
  '@/lib/hive-engine/tokens'
);

describe('GET /api/hive-engine/market', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createRouteTestServer({
      routes: {
        'GET /api/hive-engine/market': GET,
      },
    });
  });

  afterEach((done) => {
    if (server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('default (basic market data)', () => {
    it('should return basic market data', async () => {
      const mockMarketData = {
        priceHive: 0.05,
        priceChange24h: 5.5,
        volume24h: 10000,
        marketCap: 500000,
        highestBid: 0.049,
        lowestAsk: 0.051,
        lastPrice: 0.05,
      };
      const mockTokenInfo = { name: 'MEDALS Token' };

      getMarketData.mockResolvedValue(mockMarketData);
      getTokenInfo.mockResolvedValue(mockTokenInfo);

      const response = await request(server).get('/api/hive-engine/market');

      expect(response.status).toBe(200);
      expect(response.body.symbol).toBe('MEDALS');
      expect(response.body.name).toBe('MEDALS Token');
      expect(response.body.price).toBe('0.05000000');
      expect(response.body.priceChange24h).toBe('5.50%');
      expect(response.body.volume24h).toBe('10000.000');
      expect(response.body.highestBid).toBe('0.04900000');
      expect(response.body.lowestAsk).toBe('0.05100000');
    });

    it('should return unavailable message when no market data', async () => {
      getMarketData.mockResolvedValue(null);
      getTokenInfo.mockResolvedValue(null);

      const response = await request(server).get('/api/hive-engine/market');

      expect(response.status).toBe(200);
      expect(response.body.price).toBe('0.00000000');
      expect(response.body.message).toBe('Market data unavailable');
    });
  });

  describe('orderbook', () => {
    it('should return order book data', async () => {
      const mockOrderBook = {
        bids: [
          { price: 0.049, quantity: 1000, total: 49 },
          { price: 0.048, quantity: 2000, total: 96 },
        ],
        asks: [
          { price: 0.051, quantity: 500, total: 25.5 },
          { price: 0.052, quantity: 1000, total: 52 },
        ],
      };

      getAggregatedOrderBook.mockResolvedValue(mockOrderBook);

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'orderbook' });

      expect(response.status).toBe(200);
      expect(response.body.bids).toHaveLength(2);
      expect(response.body.asks).toHaveLength(2);
      expect(response.body.bids[0].price).toBe('0.04900000');
      expect(response.body.asks[0].price).toBe('0.05100000');
      expect(response.body.spread).toBe('0.00200000'); // 0.051 - 0.049
    });

    it('should return zero spread when no orders', async () => {
      getAggregatedOrderBook.mockResolvedValue({ bids: [], asks: [] });

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'orderbook' });

      expect(response.status).toBe(200);
      expect(response.body.spread).toBe('0');
    });
  });

  describe('pool', () => {
    it('should return pool liquidity data', async () => {
      const mockPoolInfo = {
        tokenPair: 'MEDALS:SWAP.HIVE',
        baseSymbol: 'MEDALS',
        quoteSymbol: 'SWAP.HIVE',
        baseQuantity: 100000,
        quoteQuantity: 5000,
        totalLiquidity: 10000,
        basePrice: 0.05,
      };

      getMedalsPoolInfo.mockResolvedValue(mockPoolInfo);

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'pool' });

      expect(response.status).toBe(200);
      expect(response.body.pool).toBeDefined();
      expect(response.body.pool.tokenPair).toBe('MEDALS:SWAP.HIVE');
      expect(response.body.pool.baseQuantity).toBe('100000.000');
      expect(response.body.pool.quoteQuantity).toBe('5000.000');
      expect(response.body.pool.price).toBe('0.05000000');
    });

    it('should return null pool when no liquidity exists', async () => {
      getMedalsPoolInfo.mockResolvedValue(null);

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'pool' });

      expect(response.status).toBe(200);
      expect(response.body.pool).toBeNull();
      expect(response.body.message).toBe('No liquidity pool found for this token pair');
    });
  });

  describe('impact', () => {
    it('should return 400 when amount is missing', async () => {
      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'impact', side: 'buy' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Amount and side');
    });

    it('should return 400 when side is missing', async () => {
      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'impact', amount: '1000' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Amount and side');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'impact', amount: '0', side: 'buy' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid amount');
    });

    it('should calculate price impact for buy', async () => {
      const mockImpact = {
        averagePrice: 0.051,
        worstPrice: 0.055,
        priceImpact: 2.5,
      };

      calculatePriceImpact.mockResolvedValue(mockImpact);

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'impact', amount: '1000', side: 'buy' });

      expect(response.status).toBe(200);
      expect(response.body.side).toBe('buy');
      expect(response.body.amount).toBe('1000.000');
      expect(response.body.averagePrice).toBe('0.05100000');
      expect(response.body.worstPrice).toBe('0.05500000');
      expect(response.body.priceImpact).toBe('2.50%');
      expect(calculatePriceImpact).toHaveBeenCalledWith(1000, true);
    });

    it('should calculate price impact for sell', async () => {
      const mockImpact = {
        averagePrice: 0.049,
        worstPrice: 0.045,
        priceImpact: 3.0,
      };

      calculatePriceImpact.mockResolvedValue(mockImpact);

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'impact', amount: '5000', side: 'sell' });

      expect(response.status).toBe(200);
      expect(response.body.side).toBe('sell');
      expect(response.body.priceImpact).toBe('3.00%');
      expect(calculatePriceImpact).toHaveBeenCalledWith(5000, false);
    });
  });

  describe('stats', () => {
    it('should return detailed token statistics', async () => {
      const mockTokenInfo = {
        name: 'MEDALS Token',
        issuer: 'sportsblock',
        precision: 3,
        circulatingSupply: '10000000.000',
        maxSupply: '500000000.000',
        stakingEnabled: true,
        unstakingCooldown: 7,
      };

      const mockMarketStats = {
        price: 0.05,
        priceChange24h: 5.5,
        volume24h: 10000,
        marketCap: 500000,
        liquidity: 50000,
        spread: 0.002,
        spreadPercent: 4.0,
      };

      const mockTopHolders = [
        { account: 'whale1', balance: 1000000, stake: 500000, total: 1500000 },
        { account: 'whale2', balance: 500000, stake: 400000, total: 900000 },
      ];

      getTokenInfo.mockResolvedValue(mockTokenInfo);
      getMarketStats.mockResolvedValue(mockMarketStats);
      getTotalStaked.mockResolvedValue(5000000);
      getTopHolders.mockResolvedValue(mockTopHolders);

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'stats' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('MEDALS Token');
      expect(response.body.issuer).toBe('sportsblock');
      expect(response.body.supply.circulating).toBe('10000000.000');
      expect(response.body.supply.max).toBe('500000000.000');
      expect(response.body.staking.totalStaked).toBe('5000000.000');
      expect(response.body.staking.stakingEnabled).toBe(true);
      expect(response.body.market.price).toBe('0.05000000');
      expect(response.body.market.spreadPercent).toBe('4.00%');
      expect(response.body.topHolders).toHaveLength(2);
      expect(response.body.topHolders[0].rank).toBe(1);
      expect(response.body.topHolders[0].account).toBe('whale1');
    });

    it('should return 404 when token not found', async () => {
      getTokenInfo.mockResolvedValue(null);
      getMarketStats.mockResolvedValue(null);
      getTotalStaked.mockResolvedValue(0);
      getTopHolders.mockResolvedValue([]);

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'stats' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Token not found');
    });

    it('should handle null market stats gracefully', async () => {
      const mockTokenInfo = {
        name: 'MEDALS Token',
        issuer: 'sportsblock',
        precision: 3,
        circulatingSupply: '10000000.000',
        maxSupply: '500000000.000',
        stakingEnabled: true,
        unstakingCooldown: 7,
      };

      getTokenInfo.mockResolvedValue(mockTokenInfo);
      getMarketStats.mockResolvedValue(null);
      getTotalStaked.mockResolvedValue(0);
      getTopHolders.mockResolvedValue([]);

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'stats' });

      expect(response.status).toBe(200);
      expect(response.body.market).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      getMarketData.mockRejectedValue(new Error('API error'));

      const response = await request(server).get('/api/hive-engine/market');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('API error');
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('caching', () => {
    it('should set cache headers for market data', async () => {
      getMarketData.mockResolvedValue({
        priceHive: 0.05,
        priceChange24h: 5.5,
        volume24h: 10000,
        marketCap: 500000,
        highestBid: 0.049,
        lowestAsk: 0.051,
        lastPrice: 0.05,
      });
      getTokenInfo.mockResolvedValue({ name: 'MEDALS' });

      const response = await request(server).get('/api/hive-engine/market');

      expect(response.headers['cache-control']).toContain('s-maxage=30');
    });

    it('should set cache headers for pool data', async () => {
      getMedalsPoolInfo.mockResolvedValue(null);

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'pool' });

      expect(response.headers['cache-control']).toContain('s-maxage=60');
    });

    it('should not cache price impact calculations', async () => {
      calculatePriceImpact.mockResolvedValue({
        averagePrice: 0.05,
        worstPrice: 0.05,
        priceImpact: 0,
      });

      const response = await request(server)
        .get('/api/hive-engine/market')
        .query({ detail: 'impact', amount: '100', side: 'buy' });

      expect(response.headers['cache-control']).toBe('no-cache');
    });
  });
});
