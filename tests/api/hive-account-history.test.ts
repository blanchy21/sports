/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';
import { GET as accountHistoryHandler } from '@/app/api/hive/account/history/route';
import { GET as accountSummaryHandler } from '@/app/api/hive/account/summary/route';

jest.mock('@/lib/hive-workerbee/account', () => ({
  getRecentOperations: jest.fn(),
}));

const { getRecentOperations } = jest.requireMock('@/lib/hive-workerbee/account');

describe('GET /api/hive/account/history', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createRouteTestServer({
      routes: {
        'GET /api/hive/account/history': accountHistoryHandler,
        'GET /api/hive/account/summary': accountSummaryHandler,
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

  it('returns 400 when username is missing', async () => {
    const response = await request(server).get('/api/hive/account/history');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Username is required' });
  });

  it('returns 500 when worker bee returns null', async () => {
    getRecentOperations.mockResolvedValueOnce(null);

    const response = await request(server)
      .get('/api/hive/account/history')
      .query({ username: 'gtg' });

    expect(getRecentOperations).toHaveBeenCalledWith('gtg', 500);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to fetch transaction history' });
  });

  it('returns operations when available', async () => {
    const operations = [
      {
        id: 1,
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'transfer',
        operation: {
          amount: '1.000 HIVE',
          from: 'alice',
          to: 'bob',
        },
        blockNumber: 123,
        transactionId: 'abc',
        description: 'Transfer 1.000 HIVE from alice to bob',
      },
    ];

    getRecentOperations.mockResolvedValueOnce(operations);

    const response = await request(server)
      .get('/api/hive/account/history')
      .query({ username: 'gtg', limit: 25 });

    expect(getRecentOperations).toHaveBeenCalledWith('gtg', 25);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      operations,
      count: 1,
      username: 'gtg',
    });
  });

  it('handles thrown errors from WorkerBee', async () => {
    getRecentOperations.mockRejectedValueOnce(new Error('boom'));

    const response = await request(server)
      .get('/api/hive/account/history')
      .query({ username: 'gtg' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Internal server error',
      details: 'boom',
    });
  });
});
