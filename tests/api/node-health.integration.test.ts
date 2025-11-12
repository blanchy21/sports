/** @jest-environment node */

jest.mock('@/lib/hive-workerbee/api', () => ({
  checkHiveNodeAvailability: jest.fn(),
  getHiveApiNodes: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/logger', () => ({
  workerBee: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

import { NodeHealthManager } from '@/lib/hive-workerbee/node-health';
import { checkHiveNodeAvailability, getHiveApiNodes } from '@/lib/hive-workerbee/api';
import { workerBee as workerBeeLog, warn as logWarn, error as logError } from '@/lib/hive-workerbee/logger';

const checkHiveNodeAvailabilityMock = checkHiveNodeAvailability as jest.MockedFunction<typeof checkHiveNodeAvailability>;
const getHiveApiNodesMock = getHiveApiNodes as jest.MockedFunction<typeof getHiveApiNodes>;
const workerBeeLogMock = workerBeeLog as jest.MockedFunction<typeof workerBeeLog>;
const logWarnMock = logWarn as jest.MockedFunction<typeof logWarn>;
const logErrorMock = logError as jest.MockedFunction<typeof logError>;

describe('NodeHealthManager integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    getHiveApiNodesMock.mockReturnValue([
      'https://node-a.example',
      'https://node-b.example',
      'https://node-c.example',
    ]);
    checkHiveNodeAvailabilityMock.mockImplementation(async (url: string) => url !== 'https://node-a.example');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('performs proactive monitoring and selects the healthiest node', async () => {
    const manager = new NodeHealthManager({
      checkInterval: 100,
      enableProactiveMonitoring: true,
    });

    await manager.startProactiveMonitoring();

    expect(checkHiveNodeAvailabilityMock).toHaveBeenCalledTimes(3);
    expect(manager.isMonitoringActive()).toBe(true);

    const bestNode = manager.getBestNode();
    expect(bestNode).toBe('https://node-b.example');
    expect(workerBeeLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Selected best node: https://node-b.example'),
    );

    await jest.advanceTimersByTimeAsync(100);

    expect(checkHiveNodeAvailabilityMock).toHaveBeenCalledTimes(6);

    const report = manager.getHealthReport();
    expect(report.totalNodes).toBe(3);
    expect(report.healthyNodes).toBe(2);
    expect(report.unhealthyNodes).toBe(1);
    expect(report.bestNode).toBe('https://node-b.example');

    expect(logWarnMock).not.toHaveBeenCalled();
    expect(logErrorMock).not.toHaveBeenCalled();

    manager.stopProactiveMonitoring();
    expect(manager.isMonitoringActive()).toBe(false);
  });
});

