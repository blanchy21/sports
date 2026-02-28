/** @jest-environment node */

import request from 'supertest';
import { createRouteTestServer } from './test-server';
import { GET, POST, DELETE } from '@/app/api/hive/realtime/route';

const monitorStatus = { isRunning: false, callbackCount: 0 };
const getStatusMock = jest.fn(() => monitorStatus);

jest.mock('@/lib/hive-workerbee/realtime', () => ({
  getRealtimeMonitor: jest.fn(() => ({ getStatus: getStatusMock })),
  startRealtimeMonitoring: jest.fn(async () => {
    monitorStatus.isRunning = true;
  }),
  stopRealtimeMonitoring: jest.fn(async () => {
    monitorStatus.isRunning = false;
  }),
}));

const mockGetUser = jest.fn();
jest.mock('@/lib/api/session-auth', () => ({
  getAuthenticatedUserFromSession: (...args: unknown[]) => mockGetUser(...args),
}));

jest.mock('@/lib/admin/config', () => ({
  requireAdmin: jest.fn((user: { username: string } | null) => {
    if (!user) return false;
    return user.username === 'sportsblock';
  }),
  ADMIN_ACCOUNTS: ['sportsblock'],
  isAdminAccount: jest.fn((username: string) => username === 'sportsblock'),
}));

jest.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: jest.fn(async () => ({
    success: true,
    remaining: 59,
    reset: Date.now() + 60000,
  })),
  RATE_LIMITS: {
    realtime: { limit: 60, windowSeconds: 60 },
  },
  createRateLimitHeaders: jest.fn(() => ({})),
}));

const { getRealtimeMonitor, startRealtimeMonitoring, stopRealtimeMonitoring } = jest.requireMock(
  '@/lib/hive-workerbee/realtime'
);

const adminUser = { userId: 'admin-1', username: 'sportsblock', authType: 'hive' };

describe('Realtime monitoring API', () => {
  let server: ReturnType<typeof createRouteTestServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    monitorStatus.isRunning = false;
    monitorStatus.callbackCount = 0;
    getStatusMock.mockImplementation(() => ({ ...monitorStatus }));
    (getRealtimeMonitor as jest.Mock).mockReturnValue({ getStatus: getStatusMock });
    (startRealtimeMonitoring as jest.Mock).mockImplementation(async () => {
      monitorStatus.isRunning = true;
    });
    (stopRealtimeMonitoring as jest.Mock).mockImplementation(async () => {
      monitorStatus.isRunning = false;
    });
    // Default: authenticated admin user
    mockGetUser.mockResolvedValue(adminUser);

    server = createRouteTestServer({
      routes: {
        'GET /api/hive/realtime': GET,
        'POST /api/hive/realtime': POST,
        'DELETE /api/hive/realtime': DELETE,
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

  it('returns monitoring status', async () => {
    const response = await request(server).get('/api/hive/realtime');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      status: { isRunning: false, callbackCount: 0 },
    });
    expect(getRealtimeMonitor).toHaveBeenCalled();
  });

  it('starts monitoring on POST (admin)', async () => {
    const response = await request(server).post('/api/hive/realtime');

    expect(response.status).toBe(200);
    expect(startRealtimeMonitoring).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      success: true,
      started: true,
      status: { isRunning: true, callbackCount: 0 },
    });
  });

  it('returns 401 when POST without auth', async () => {
    mockGetUser.mockResolvedValue(null);

    const response = await request(server).post('/api/hive/realtime');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Authentication required');
  });

  it('returns 403 when POST from non-admin', async () => {
    mockGetUser.mockResolvedValue({ userId: 'user-1', username: 'regular-user', authType: 'hive' });

    const response = await request(server).post('/api/hive/realtime');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Admin access required');
  });

  it('returns 500 when start fails', async () => {
    (startRealtimeMonitoring as jest.Mock).mockRejectedValueOnce(new Error('subscribe failed'));

    const response = await request(server).post('/api/hive/realtime');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('subscribe failed');
    expect(response.body.code).toBe('INTERNAL_ERROR');
  });

  it('stops monitoring on DELETE (admin)', async () => {
    monitorStatus.isRunning = true;

    const response = await request(server).delete('/api/hive/realtime');

    expect(response.status).toBe(200);
    expect(stopRealtimeMonitoring).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      success: true,
      stopped: true,
      status: { isRunning: false, callbackCount: 0 },
    });
  });

  it('returns 401 when DELETE without auth', async () => {
    mockGetUser.mockResolvedValue(null);

    const response = await request(server).delete('/api/hive/realtime');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Authentication required');
  });

  it('returns 500 when stop fails', async () => {
    (stopRealtimeMonitoring as jest.Mock).mockRejectedValueOnce(new Error('shutdown error'));

    const response = await request(server).delete('/api/hive/realtime');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('shutdown error');
    expect(response.body.code).toBe('INTERNAL_ERROR');
  });
});
