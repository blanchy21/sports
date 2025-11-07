/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';
import { GET as postingHandler } from '@/app/api/hive/posting/route';

jest.mock('@/lib/hive-workerbee/posting', () => ({
  canUserPost: jest.fn(),
}));

const { canUserPost } = jest.requireMock('@/lib/hive-workerbee/posting');

describe('GET /api/hive/posting', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createRouteTestServer({
      routes: {
        'GET /api/hive/posting': postingHandler,
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
    const response = await request(server).get('/api/hive/posting');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Username query parameter is required',
    });
  });

  it('returns posting eligibility when available', async () => {
    canUserPost.mockResolvedValueOnce(true);

    const response = await request(server)
      .get('/api/hive/posting')
      .query({ username: 'gtg' });

    expect(response.status).toBe(200);
    expect(canUserPost).toHaveBeenCalledWith('gtg');
    expect(response.body).toEqual({
      success: true,
      username: 'gtg',
      canPost: true,
    });
  });

  it('returns 502 when workerbee throws', async () => {
    canUserPost.mockRejectedValueOnce(new Error('RPC unavailable'));

    const response = await request(server)
      .get('/api/hive/posting')
      .query({ username: 'gtg' });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      success: false,
      error: 'RPC unavailable',
    });
  });
});
