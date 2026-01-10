/** @jest-environment node */

import { makeHiveApiCall } from '@/lib/hive-workerbee/api';

const getBestNodeMock = jest.fn();
const startProactiveMonitoringMock = jest.fn();

jest.mock('@/lib/hive-workerbee/wax-helpers', () => ({
  getAccountWax: jest.fn(),
  getContentWax: jest.fn(),
  getDiscussionsWax: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/node-health', () => ({
  getNodeHealthManager: jest.fn(() => ({
    getBestNode: getBestNodeMock,
    startProactiveMonitoring: startProactiveMonitoringMock,
  })),
}));

const workerBeeLogMock = jest.fn();
const logInfoMock = jest.fn();
const logWarnMock = jest.fn();
const logErrorMock = jest.fn();

jest.mock('@/lib/hive-workerbee/logger', () => ({
  workerBee: (...args: unknown[]) => workerBeeLogMock(...args),
  info: (...args: unknown[]) => logInfoMock(...args),
  warn: (...args: unknown[]) => logWarnMock(...args),
  error: (...args: unknown[]) => logErrorMock(...args),
}));

describe('makeHiveApiCall integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    getBestNodeMock.mockReturnValue('https://best-node.example');
    const fetchMock = jest.fn();
    fetchMock.mockRejectedValueOnce(new Error('best node down'));
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          result: { chain_id: 'abc123' },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('falls back when the healthiest node fails and logs each attempt', async () => {
    const result = await makeHiveApiCall('condenser_api', 'get_dynamic_global_properties');

    expect(result).toEqual({ chain_id: 'abc123' });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[0][0]).toBe('https://best-node.example');
    expect(fetchCalls[1][0]).toBe('https://api.hive.blog');

    expect(workerBeeLogMock).toHaveBeenCalledWith(
      'Hive API try condenser_api.get_dynamic_global_properties',
      undefined,
      expect.objectContaining({ nodeUrl: 'https://best-node.example' }),
    );
    expect(workerBeeLogMock).toHaveBeenCalledWith(
      'Hive API success condenser_api.get_dynamic_global_properties',
      undefined,
      expect.objectContaining({ nodeUrl: 'https://api.hive.blog' }),
    );

    expect(workerBeeLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Hive API failed for condenser_api.get_dynamic_global_properties using https://best-node.example'),
    );
    expect(logInfoMock).toHaveBeenCalledWith(
      expect.stringContaining('https://api.hive.blog responded in'),
      'condenser_api.get_dynamic_global_properties',
      expect.objectContaining({ nodeUrl: 'https://api.hive.blog', duration: expect.any(Number) }),
    );
    expect(logErrorMock).not.toHaveBeenCalled();
  });
});

