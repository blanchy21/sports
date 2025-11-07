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

const {
  getRealtimeMonitor,
  startRealtimeMonitoring,
  stopRealtimeMonitoring,
} = jest.requireMock('@/lib/hive-workerbee/realtime');

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

  it('starts monitoring on POST', async () => {
    const response = await request(server).post('/api/hive/realtime');

    expect(response.status).toBe(200);
    expect(startRealtimeMonitoring).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      success: true,
      started: true,
      status: { isRunning: true, callbackCount: 0 },
    });
  });

  it('returns 502 when start fails', async () => {
    (startRealtimeMonitoring as jest.Mock).mockRejectedValueOnce(new Error('subscribe failed'));

    const response = await request(server).post('/api/hive/realtime');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      success: false,
      error: 'subscribe failed',
    });
  });

  it('stops monitoring on DELETE', async () => {
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

  it('returns 502 when stop fails', async () => {
    (stopRealtimeMonitoring as jest.Mock).mockRejectedValueOnce(new Error('shutdown error'));

    const response = await request(server).delete('/api/hive/realtime');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      success: false,
      error: 'shutdown error',
    });
  });
});
