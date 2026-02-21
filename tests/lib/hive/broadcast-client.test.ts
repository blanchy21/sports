import { renderHook } from '@testing-library/react';
import { broadcastOperations, useBroadcast } from '@/lib/hive/broadcast-client';
import type { HiveOperation } from '@/types/hive-operations';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseAioha = jest.fn();
jest.mock('@/contexts/AiohaProvider', () => ({
  useAioha: () => mockUseAioha(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleOps: HiveOperation[] = [
  ['vote', { voter: 'alice', author: 'bob', permlink: 'post-1', weight: 10000 }],
];

// ---------------------------------------------------------------------------
// broadcastOperations — soft (custodial relay)
// ---------------------------------------------------------------------------

describe('broadcastOperations — soft (custodial relay)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns success with transactionId on successful relay', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { transactionId: 'tx-123' } }),
    });

    const result = await broadcastOperations(sampleOps, { authType: 'soft' });

    expect(result).toEqual({ success: true, transactionId: 'tx-123' });
    expect(mockFetch).toHaveBeenCalledWith('/api/hive/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ operations: sampleOps }),
    });
  });

  it('returns error when relay responds with failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { message: 'Bad request', code: 'VALIDATION_ERROR' },
      }),
    });

    const result = await broadcastOperations(sampleOps, { authType: 'soft' });

    expect(result).toEqual({ success: false, error: 'Bad request' });
  });

  it('returns generic error when relay body has no error object', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ success: true, data: {} }),
    });

    const result = await broadcastOperations(sampleOps, { authType: 'soft' });

    expect(result).toEqual({ success: false, error: 'Relay request failed (500)' });
  });

  it('rejects active key operations for custodial accounts', async () => {
    const result = await broadcastOperations(sampleOps, {
      authType: 'soft',
      keyType: 'active',
    });

    expect(result).toEqual({
      success: false,
      error: 'Active key operations are not supported for custodial accounts',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('propagates network errors from fetch', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    await expect(broadcastOperations(sampleOps, { authType: 'soft' })).rejects.toThrow(
      'Network failure'
    );
  });
});

// ---------------------------------------------------------------------------
// broadcastOperations — hive (wallet)
// ---------------------------------------------------------------------------

describe('broadcastOperations — hive (wallet)', () => {
  it('returns success when aioha signs and broadcasts', async () => {
    const mockAioha = {
      signAndBroadcastTx: jest.fn().mockResolvedValue({ id: 'tx-456' }),
    };

    const result = await broadcastOperations(sampleOps, {
      authType: 'hive',
      aioha: mockAioha,
    });

    expect(result).toEqual({ success: true, transactionId: 'tx-456' });
    expect(mockAioha.signAndBroadcastTx).toHaveBeenCalledWith(sampleOps, 'posting');
  });

  it('passes keyType through to signAndBroadcastTx', async () => {
    const mockAioha = {
      signAndBroadcastTx: jest.fn().mockResolvedValue({ id: 'tx-789' }),
    };

    await broadcastOperations(sampleOps, {
      authType: 'hive',
      aioha: mockAioha,
      keyType: 'active',
    });

    expect(mockAioha.signAndBroadcastTx).toHaveBeenCalledWith(sampleOps, 'active');
  });

  it('returns "unknown" transactionId when result has no id', async () => {
    const mockAioha = {
      signAndBroadcastTx: jest.fn().mockResolvedValue({}),
    };

    const result = await broadcastOperations(sampleOps, {
      authType: 'hive',
      aioha: mockAioha,
    });

    expect(result).toEqual({ success: true, transactionId: 'unknown' });
  });

  it('returns error when aioha is undefined', async () => {
    const result = await broadcastOperations(sampleOps, {
      authType: 'hive',
      aioha: undefined,
    });

    expect(result).toEqual({
      success: false,
      error: 'Aioha wallet is not available. Please refresh and try again.',
    });
  });

  it('returns error when aioha lacks signAndBroadcastTx', async () => {
    const result = await broadcastOperations(sampleOps, {
      authType: 'hive',
      aioha: { someOtherMethod: jest.fn() },
    });

    expect(result).toEqual({
      success: false,
      error: 'Aioha wallet is not available. Please refresh and try again.',
    });
  });

  it('catches Error thrown by aioha and returns error message', async () => {
    const mockAioha = {
      signAndBroadcastTx: jest.fn().mockRejectedValue(new Error('User rejected')),
    };

    const result = await broadcastOperations(sampleOps, {
      authType: 'hive',
      aioha: mockAioha,
    });

    expect(result).toEqual({ success: false, error: 'User rejected' });
  });

  it('catches non-Error thrown by aioha and stringifies it', async () => {
    const mockAioha = {
      signAndBroadcastTx: jest.fn().mockRejectedValue('string error'),
    };

    const result = await broadcastOperations(sampleOps, {
      authType: 'hive',
      aioha: mockAioha,
    });

    expect(result).toEqual({ success: false, error: 'string error' });
  });
});

// ---------------------------------------------------------------------------
// broadcastOperations — guest / unknown
// ---------------------------------------------------------------------------

describe('broadcastOperations — guest / unknown authType', () => {
  it('returns auth required error for guest', async () => {
    const result = await broadcastOperations(sampleOps, { authType: 'guest' });

    expect(result).toEqual({
      success: false,
      error: 'Authentication required to broadcast operations',
    });
  });

  it('returns auth required error for unknown authType', async () => {
    const result = await broadcastOperations(sampleOps, {
      authType: 'unknown' as never,
    });

    expect(result).toEqual({
      success: false,
      error: 'Authentication required to broadcast operations',
    });
  });
});

// ---------------------------------------------------------------------------
// useBroadcast hook
// ---------------------------------------------------------------------------

describe('useBroadcast', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseAioha.mockReset();
    mockFetch.mockReset();
  });

  it('returns broadcast function and isCustodial flag', () => {
    mockUseAuth.mockReturnValue({ authType: 'soft' });
    mockUseAioha.mockReturnValue({ aioha: null });

    const { result } = renderHook(() => useBroadcast());

    expect(typeof result.current.broadcast).toBe('function');
    expect(typeof result.current.isCustodial).toBe('boolean');
  });

  it('sets isCustodial=true for soft auth', () => {
    mockUseAuth.mockReturnValue({ authType: 'soft' });
    mockUseAioha.mockReturnValue({ aioha: null });

    const { result } = renderHook(() => useBroadcast());

    expect(result.current.isCustodial).toBe(true);
  });

  it('sets isCustodial=false for hive auth', () => {
    mockUseAuth.mockReturnValue({ authType: 'hive' });
    mockUseAioha.mockReturnValue({ aioha: {} });

    const { result } = renderHook(() => useBroadcast());

    expect(result.current.isCustodial).toBe(false);
  });

  it('sets isCustodial=false for guest auth', () => {
    mockUseAuth.mockReturnValue({ authType: 'guest' });
    mockUseAioha.mockReturnValue({ aioha: null });

    const { result } = renderHook(() => useBroadcast());

    expect(result.current.isCustodial).toBe(false);
  });

  it('broadcast delegates to relay for soft auth', async () => {
    mockUseAuth.mockReturnValue({ authType: 'soft' });
    mockUseAioha.mockReturnValue({ aioha: null });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { transactionId: 'relay-tx' } }),
    });

    const { result } = renderHook(() => useBroadcast());
    const broadcastResult = await result.current.broadcast(sampleOps);

    expect(broadcastResult).toEqual({ success: true, transactionId: 'relay-tx' });
    expect(mockFetch).toHaveBeenCalled();
  });

  it('broadcast delegates to aioha for hive auth', async () => {
    const mockAioha = {
      signAndBroadcastTx: jest.fn().mockResolvedValue({ id: 'wallet-tx' }),
    };
    mockUseAuth.mockReturnValue({ authType: 'hive' });
    mockUseAioha.mockReturnValue({ aioha: mockAioha });

    const { result } = renderHook(() => useBroadcast());
    const broadcastResult = await result.current.broadcast(sampleOps, 'active');

    expect(broadcastResult).toEqual({ success: true, transactionId: 'wallet-tx' });
    expect(mockAioha.signAndBroadcastTx).toHaveBeenCalledWith(sampleOps, 'active');
  });
});
