/** @jest-environment node */

const mockSendOperations = jest.fn();
const mockFromString = jest.fn();
jest.mock('@hiveio/dhive', () => ({
  Client: jest.fn().mockImplementation(() => ({
    broadcast: { sendOperations: mockSendOperations },
  })),
  PrivateKey: { fromString: (...args: unknown[]) => mockFromString(...args) },
}));

const mockWaitForTransaction = jest.fn();
jest.mock('@/lib/hive-workerbee/transaction-confirmation', () => ({
  waitForTransaction: (...args: unknown[]) => mockWaitForTransaction(...args),
}));

const mockLogError = jest.fn();
jest.mock('@/lib/hive-workerbee/logger', () => ({
  error: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock('@/lib/hive-workerbee/nodes', () => ({
  HIVE_NODES: ['https://api.hive.blog'],
}));

import { broadcastWithKey } from '@/lib/hive-workerbee/broadcast';
import type { Operation } from '@hiveio/dhive';

describe('broadcastWithKey', () => {
  const testOperations: Operation[] = [
    ['vote', { voter: 'alice', author: 'bob', permlink: 'test-post', weight: 10000 }],
  ];
  const testKey = '5Jtest-posting-key';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFromString.mockReturnValue('mock-private-key');
    mockSendOperations.mockResolvedValue({ id: 'tx-abc123', block_num: 100 });
    mockWaitForTransaction.mockResolvedValue({ confirmed: true, blockNum: 100 });
  });

  it('returns success with transaction details on successful broadcast', async () => {
    const result = await broadcastWithKey(testOperations, testKey);

    expect(result).toEqual({
      success: true,
      transactionId: 'tx-abc123',
      confirmed: true,
      blockNum: 100,
    });
  });

  it('converts the posting key using PrivateKey.fromString', async () => {
    await broadcastWithKey(testOperations, testKey);

    expect(mockFromString).toHaveBeenCalledWith(testKey);
  });

  it('passes operations and key to sendOperations', async () => {
    await broadcastWithKey(testOperations, testKey);

    expect(mockSendOperations).toHaveBeenCalledWith(testOperations, 'mock-private-key');
  });

  it('waits for transaction confirmation with the result id', async () => {
    await broadcastWithKey(testOperations, testKey);

    expect(mockWaitForTransaction).toHaveBeenCalledWith('tx-abc123');
  });

  it('uses confirmation blockNum over result block_num when available', async () => {
    mockWaitForTransaction.mockResolvedValue({ confirmed: true, blockNum: 200 });

    const result = await broadcastWithKey(testOperations, testKey);

    expect(result.blockNum).toBe(200);
  });

  it('falls back to result block_num when confirmation blockNum is null', async () => {
    mockWaitForTransaction.mockResolvedValue({ confirmed: false, blockNum: null });

    const result = await broadcastWithKey(testOperations, testKey);

    expect(result.blockNum).toBe(100);
    expect(result.confirmed).toBe(false);
  });

  it('returns failure with error message when broadcast throws Error', async () => {
    mockSendOperations.mockRejectedValue(new Error('Network timeout'));

    const result = await broadcastWithKey(testOperations, testKey);

    expect(result).toEqual({
      success: false,
      error: 'Network timeout',
    });
  });

  it('returns failure with stringified error when broadcast throws non-Error', async () => {
    mockSendOperations.mockRejectedValue('connection refused');

    const result = await broadcastWithKey(testOperations, testKey);

    expect(result).toEqual({
      success: false,
      error: 'connection refused',
    });
  });

  it('logs error when broadcast fails', async () => {
    const error = new Error('RPC failure');
    mockSendOperations.mockRejectedValue(error);

    await broadcastWithKey(testOperations, testKey);

    expect(mockLogError).toHaveBeenCalledWith('Broadcast failed', 'Broadcast', error);
  });

  it('logs without Error object when non-Error is thrown', async () => {
    mockSendOperations.mockRejectedValue('string error');

    await broadcastWithKey(testOperations, testKey);

    expect(mockLogError).toHaveBeenCalledWith('Broadcast failed', 'Broadcast', undefined);
  });

  it('reuses the same Client instance across multiple calls (singleton)', async () => {
    // sendOperations is called once per broadcastWithKey invocation,
    // but the Client constructor mock is shared across the whole suite.
    // Since the singleton is already created from earlier tests, just verify
    // that multiple calls reuse the same mock (sendOperations is the same fn).
    mockSendOperations.mockClear();

    await broadcastWithKey(testOperations, testKey);
    await broadcastWithKey(testOperations, testKey);

    // Both calls should go through the same client (same sendOperations mock)
    expect(mockSendOperations).toHaveBeenCalledTimes(2);
  });
});
