/** @jest-environment node */

const mockMakeHiveApiCall = jest.fn();
jest.mock('@/lib/hive-workerbee/api', () => ({
  makeHiveApiCall: (...args: unknown[]) => mockMakeHiveApiCall(...args),
}));

const mockWorkerBeeLog = jest.fn();
const mockLogWarn = jest.fn();
jest.mock('@/lib/hive-workerbee/logger', () => ({
  workerBee: (...args: unknown[]) => mockWorkerBeeLog(...args),
  warn: (...args: unknown[]) => mockLogWarn(...args),
}));

import { waitForTransaction } from '@/lib/hive-workerbee/transaction-confirmation';

describe('waitForTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Early-return cases (no polling)
  // -----------------------------------------------------------------------

  it('returns error immediately for empty transactionId', async () => {
    const result = await waitForTransaction('');
    expect(result).toEqual({ confirmed: false, error: 'No transaction ID provided' });
    expect(mockMakeHiveApiCall).not.toHaveBeenCalled();
  });

  it('returns error immediately for "unknown" transactionId', async () => {
    const result = await waitForTransaction('unknown');
    expect(result).toEqual({ confirmed: false, error: 'No transaction ID provided' });
    expect(mockMakeHiveApiCall).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Immediate confirmation
  // -----------------------------------------------------------------------

  it('returns confirmed when API returns block_num on first poll', async () => {
    mockMakeHiveApiCall.mockResolvedValueOnce({ block_num: 42000 });

    const promise = waitForTransaction('abc123');
    // Let the first poll resolve
    await jest.advanceTimersByTimeAsync(0);

    const result = await promise;
    expect(result).toEqual({ confirmed: true, blockNum: 42000 });
    expect(mockMakeHiveApiCall).toHaveBeenCalledWith('condenser_api', 'get_transaction', [
      'abc123',
    ]);
  });

  it('logs when transaction is confirmed', async () => {
    mockMakeHiveApiCall.mockResolvedValueOnce({ block_num: 100 });

    const promise = waitForTransaction('tx1');
    await jest.advanceTimersByTimeAsync(0);
    await promise;

    expect(mockWorkerBeeLog).toHaveBeenCalledWith(
      expect.stringContaining('confirmed in block 100')
    );
  });

  // -----------------------------------------------------------------------
  // Polling behaviour
  // -----------------------------------------------------------------------

  it('retries after API throws and confirms on a later poll', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    // First two calls throw, third returns block_num
    mockMakeHiveApiCall
      .mockRejectedValueOnce(new Error('not found'))
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ block_num: 555 });

    const promise = waitForTransaction('tx-retry', {
      timeoutMs: 30_000,
      pollIntervalMs: 1_000,
    });

    // First poll: throws, then sleeps 1s
    await jest.advanceTimersByTimeAsync(0);
    now = 1_000;
    await jest.advanceTimersByTimeAsync(1_000);

    // Second poll: throws, then sleeps 1s
    now = 2_000;
    await jest.advanceTimersByTimeAsync(1_000);

    // Third poll: succeeds
    const result = await promise;
    expect(result).toEqual({ confirmed: true, blockNum: 555 });
    expect(mockMakeHiveApiCall).toHaveBeenCalledTimes(3);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('continues polling when API returns a result without block_num', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    mockMakeHiveApiCall
      .mockResolvedValueOnce({}) // no block_num
      .mockResolvedValueOnce({ block_num: 700 });

    const promise = waitForTransaction('tx-no-block', {
      timeoutMs: 30_000,
      pollIntervalMs: 1_000,
    });

    // First poll: result without block_num → sleep
    await jest.advanceTimersByTimeAsync(0);
    now = 1_000;
    await jest.advanceTimersByTimeAsync(1_000);

    // Second poll: success
    const result = await promise;
    expect(result).toEqual({ confirmed: true, blockNum: 700 });
    expect(mockMakeHiveApiCall).toHaveBeenCalledTimes(2);

    jest.spyOn(Date, 'now').mockRestore();
  });

  // -----------------------------------------------------------------------
  // Timeout
  // -----------------------------------------------------------------------

  it('returns timeout error when timeoutMs elapses without confirmation', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    mockMakeHiveApiCall.mockRejectedValue(new Error('not found'));

    const promise = waitForTransaction('tx-timeout', {
      timeoutMs: 5_000,
      pollIntervalMs: 2_000,
    });

    // Poll 1 at t=0 → throws → sleep 2s
    await jest.advanceTimersByTimeAsync(0);
    now = 2_000;
    await jest.advanceTimersByTimeAsync(2_000);

    // Poll 2 at t=2000 → throws → sleep 2s
    now = 4_000;
    await jest.advanceTimersByTimeAsync(2_000);

    // Now Date.now() = 4000 < 5000, so poll 3 at t=4000 → throws → sleep 2s
    now = 6_000;
    await jest.advanceTimersByTimeAsync(2_000);

    // Loop condition: 6000 >= 5000 → exits
    const result = await promise;
    expect(result).toEqual({
      confirmed: false,
      error: 'Transaction not confirmed within 5000ms',
    });

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('logs a warning on timeout', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    mockMakeHiveApiCall.mockRejectedValue(new Error('nope'));

    const promise = waitForTransaction('tx-warn', {
      timeoutMs: 1_000,
      pollIntervalMs: 500,
    });

    // Poll at 0 → fail → sleep 500
    await jest.advanceTimersByTimeAsync(0);
    now = 500;
    await jest.advanceTimersByTimeAsync(500);

    // Poll at 500 → fail → sleep 500
    now = 1_000;
    await jest.advanceTimersByTimeAsync(500);

    // 1000 >= 1000 → exit
    await promise;

    expect(mockLogWarn).toHaveBeenCalledWith(
      expect.stringContaining('not confirmed after 1000ms'),
      'waitForTransaction'
    );

    jest.spyOn(Date, 'now').mockRestore();
  });

  // -----------------------------------------------------------------------
  // Custom options
  // -----------------------------------------------------------------------

  it('respects custom pollIntervalMs', async () => {
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    mockMakeHiveApiCall
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ block_num: 999 });

    const promise = waitForTransaction('tx-interval', {
      timeoutMs: 30_000,
      pollIntervalMs: 5_000,
    });

    // First poll throws → sleep 5s
    await jest.advanceTimersByTimeAsync(0);
    now = 5_000;
    await jest.advanceTimersByTimeAsync(5_000);

    const result = await promise;
    expect(result).toEqual({ confirmed: true, blockNum: 999 });

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('uses default options when none are provided', async () => {
    mockMakeHiveApiCall.mockResolvedValueOnce({ block_num: 1 });

    const promise = waitForTransaction('tx-defaults');
    await jest.advanceTimersByTimeAsync(0);
    await promise;

    // Verify the initial log includes default values
    expect(mockWorkerBeeLog).toHaveBeenCalledWith(
      expect.stringContaining('tx-defaults'),
      undefined,
      expect.objectContaining({ timeoutMs: 30_000, pollIntervalMs: 3_000 })
    );
  });
});
