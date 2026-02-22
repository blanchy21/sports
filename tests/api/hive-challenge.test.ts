/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';

const mockCreateChallenge = jest.fn();
jest.mock('@/lib/auth/hive-challenge', () => ({
  createChallenge: (...args: unknown[]) => mockCreateChallenge(...args),
}));

import { GET } from '@/app/api/auth/hive-challenge/route';

describe('GET /api/auth/hive-challenge', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateChallenge.mockReturnValue({ challenge: 'test-challenge', mac: 'test-mac' });
    server = createRouteTestServer({
      routes: {
        'GET /api/auth/hive-challenge': GET,
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

  it('returns 200 with success, challenge, and mac for a valid username', async () => {
    const response = await request(server)
      .get('/api/auth/hive-challenge')
      .query({ username: 'validuser' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      challenge: 'test-challenge',
      mac: 'test-mac',
    });
    expect(mockCreateChallenge).toHaveBeenCalledWith('validuser');
  });

  it('lowercases the username before validation', async () => {
    const response = await request(server)
      .get('/api/auth/hive-challenge')
      .query({ username: 'ValidUser' });

    expect(response.status).toBe(200);
    expect(mockCreateChallenge).toHaveBeenCalledWith('validuser');
  });

  it('returns 400 when username is missing', async () => {
    const response = await request(server).get('/api/auth/hive-challenge');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid or missing username',
    });
    expect(mockCreateChallenge).not.toHaveBeenCalled();
  });

  it('returns 400 when username is empty', async () => {
    const response = await request(server).get('/api/auth/hive-challenge').query({ username: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid or missing username',
    });
    expect(mockCreateChallenge).not.toHaveBeenCalled();
  });

  it('returns 400 when username starts with a number', async () => {
    const response = await request(server)
      .get('/api/auth/hive-challenge')
      .query({ username: '1baduser' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid or missing username',
    });
    expect(mockCreateChallenge).not.toHaveBeenCalled();
  });

  it('returns 400 when username is too short after lowercasing', async () => {
    const response = await request(server)
      .get('/api/auth/hive-challenge')
      .query({ username: 'ab' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid or missing username',
    });
    expect(mockCreateChallenge).not.toHaveBeenCalled();
  });

  it('returns 400 when username is only one character', async () => {
    const response = await request(server).get('/api/auth/hive-challenge').query({ username: 'a' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid or missing username',
    });
    expect(mockCreateChallenge).not.toHaveBeenCalled();
  });

  it('returns 400 when username ends with a dash', async () => {
    const response = await request(server)
      .get('/api/auth/hive-challenge')
      .query({ username: 'user-name-' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid or missing username',
    });
    expect(mockCreateChallenge).not.toHaveBeenCalled();
  });

  it('returns 400 when username ends with a dot', async () => {
    const response = await request(server)
      .get('/api/auth/hive-challenge')
      .query({ username: 'user.name.' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid or missing username',
    });
    expect(mockCreateChallenge).not.toHaveBeenCalled();
  });

  it('accepts a valid username with dots and dashes', async () => {
    const response = await request(server)
      .get('/api/auth/hive-challenge')
      .query({ username: 'user.name-test' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      challenge: 'test-challenge',
      mac: 'test-mac',
    });
    expect(mockCreateChallenge).toHaveBeenCalledWith('user.name-test');
  });
});
