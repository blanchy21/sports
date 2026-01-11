/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';
import { GET as hiveAccountSummaryHandler } from '@/app/api/hive/account/summary/route';

jest.mock('@/lib/hive-workerbee/account', () => ({
  fetchUserAccount: jest.fn(),
}));

const { fetchUserAccount } = jest.requireMock('@/lib/hive-workerbee/account');

describe('GET /api/hive/account/summary', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createRouteTestServer({
      routes: {
        'GET /api/hive/account/summary': hiveAccountSummaryHandler,
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
    const response = await request(server).get('/api/hive/account/summary');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.error).toContain('username');
  });

  it('returns 404 when user is not found', async () => {
    fetchUserAccount.mockResolvedValueOnce(null);

    const response = await request(server)
      .get('/api/hive/account/summary')
      .query({ username: 'missing-user' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.error).toBe('Account missing-user not found');
  });

  it('returns account data when user exists', async () => {
    const account = {
      username: 'gtg',
      reputation: 75,
      joinedAt: new Date('2023-01-01T00:00:00.000Z'),
      stats: {
        followers: 10,
      },
    };

    fetchUserAccount.mockResolvedValueOnce(account);

    const response = await request(server)
      .get('/api/hive/account/summary')
      .query({ username: 'gtg' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      account: {
        username: 'gtg',
        reputation: 75,
        joinedAt: '2023-01-01T00:00:00.000Z',
        stats: {
          followers: 10,
        },
      },
    });
  });

  it('handles upstream errors', async () => {
    fetchUserAccount.mockRejectedValueOnce(new Error('Hive RPC down'));

    const response = await request(server)
      .get('/api/hive/account/summary')
      .query({ username: 'gtg' });

    expect(response.status).toBe(502);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('UPSTREAM_ERROR');
    expect(response.body.error).toBe('Hive RPC down');
  });
});
