/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';
import { GET, POST } from '@/app/api/monitoring/route';

jest.mock('@/lib/hive-workerbee/monitoring', () => ({
  getMonitoringStats: jest.fn().mockReturnValue({ requests: 0, errors: 0 }),
  clearMonitoringData: jest.fn(),
  exportMonitoringData: jest.fn().mockReturnValue({ history: [] }),
}));

jest.mock('@/lib/hive-workerbee/optimization', () => ({
  getOptimizationMetrics: jest.fn().mockReturnValue({ cacheHits: 0, cacheMisses: 0 }),
  getCacheStatistics: jest.fn(),
  clearOptimizationCache: jest.fn(),
}));

// Mock the cache module - inline to avoid hoisting issues
jest.mock('@/lib/cache', () => ({
  getMemoryCache: jest.fn().mockReturnValue({
    getStats: jest.fn().mockReturnValue({ size: 10, maxEntries: 1000, hits: 5, misses: 2, hitRate: 0.71 }),
  }),
  getTieredCache: jest.fn().mockResolvedValue({
    getStats: jest.fn().mockReturnValue({ hitRate: 0.8 }),
    isRedisAvailable: jest.fn().mockReturnValue(false),
  }),
}));

const { clearMonitoringData } = jest.requireMock('@/lib/hive-workerbee/monitoring');
const { clearOptimizationCache } = jest.requireMock('@/lib/hive-workerbee/optimization');

describe('Monitoring API routes', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createRouteTestServer({
      routes: {
        'GET /api/monitoring': GET,
        'POST /api/monitoring': POST,
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

  it('returns stats payload for GET ?action=stats', async () => {
    const response = await request(server)
      .get('/api/monitoring')
      .query({ action: 'stats' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      monitoring: expect.any(Object),
      optimization: expect.any(Object),
      cache: expect.any(Object),
      timestamp: expect.any(String),
    });
  });

  it('returns export payload for GET ?action=export', async () => {
    const response = await request(server)
      .get('/api/monitoring')
      .query({ action: 'export' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      monitoring: expect.any(Object),
      optimization: expect.any(Object),
      timestamp: expect.any(String),
    });
    // Export doesn't include cache stats
    expect(response.body.cache).toBeUndefined();
  });

  it('returns 400 for invalid GET action', async () => {
    const response = await request(server)
      .get('/api/monitoring')
      .query({ action: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid action. Use ?action=stats or ?action=export' });
  });

  it('clears monitoring data via POST', async () => {
    const response = await request(server)
      .post('/api/monitoring')
      .send({ action: 'clear' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'All monitoring data cleared',
    });
    expect(clearMonitoringData).toHaveBeenCalledTimes(1);
    expect(clearOptimizationCache).toHaveBeenCalledTimes(1);
  });

  it('clears cache via POST', async () => {
    const response = await request(server)
      .post('/api/monitoring')
      .send({ action: 'clear-cache' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Cache cleared',
    });
    expect(clearOptimizationCache).toHaveBeenCalledTimes(1);
  });

  it('clears monitoring via POST', async () => {
    const response = await request(server)
      .post('/api/monitoring')
      .send({ action: 'clear-monitoring' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Monitoring data cleared',
    });
    expect(clearMonitoringData).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid POST action', async () => {
    const response = await request(server)
      .post('/api/monitoring')
      .send({ action: 'unknown' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid action' });
  });
});
