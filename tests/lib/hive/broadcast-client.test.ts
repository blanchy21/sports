import { renderHook } from '@testing-library/react';
import { broadcastOperations, useBroadcast } from '@/lib/hive/broadcast-client';
import type { HiveOperation } from '@/types/hive-operations';
import type { WalletContextValue } from '@/lib/wallet/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseWallet = jest.fn();
jest.mock('@/contexts/WalletProvider', () => ({
  useWallet: () => mockUseWallet(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleOps: HiveOperation[] = [
  ['vote', { voter: 'alice', author: 'bob', permlink: 'post-1', weight: 10000 }],
];

function createMockWallet(overrides: Partial<WalletContextValue> = {}): WalletContextValue {
  return {
    isReady: true,
    currentUser: 'testuser',
    currentProvider: 'keychain',
    availableProviders: ['keychain', 'hivesigner'],
    login: jest.fn(),
    logout: jest.fn(),
    signMessage: jest.fn(),
    signAndBroadcast: jest.fn().mockResolvedValue({ success: true, transactionId: 'tx-456' }),
    ...overrides,
  } as WalletContextValue;
}

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
  it('returns success when wallet signs and broadcasts', async () => {
    const mockWallet = createMockWallet();

    const result = await broadcastOperations(sampleOps, {
      authType: 'hive',
      wallet: mockWallet,
    });

    expect(result).toEqual({ success: true, transactionId: 'tx-456' });
    expect(mockWallet.signAndBroadcast).toHaveBeenCalledWith(sampleOps, 'posting');
  });

  it('passes keyType through to signAndBroadcast', async () => {
    const mockWallet = createMockWallet();

    await broadcastOperations(sampleOps, {
      authType: 'hive',
      wallet: mockWallet,
      keyType: 'active',
    });

    expect(mockWallet.signAndBroadcast).toHaveBeenCalledWith(sampleOps, 'active');
  });

  it('returns error when wallet is undefined', async () => {
    const result = await broadcastOperations(sampleOps, {
      authType: 'hive',
      wallet: undefined,
    });

    expect(result).toEqual({
      success: false,
      error: 'Wallet is not connected. Please refresh and try again.',
    });
  });

  it('returns error when wallet has no currentUser', async () => {
    const mockWallet = createMockWallet({ currentUser: null });

    const result = await broadcastOperations(sampleOps, {
      authType: 'hive',
      wallet: mockWallet,
    });

    expect(result).toEqual({
      success: false,
      error: 'Wallet is not connected. Please refresh and try again.',
    });
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
    mockUseWallet.mockReset();
    mockFetch.mockReset();
  });

  it('returns broadcast function and isCustodial flag', () => {
    mockUseAuth.mockReturnValue({ authType: 'soft' });
    mockUseWallet.mockReturnValue(createMockWallet({ currentUser: null }));

    const { result } = renderHook(() => useBroadcast());

    expect(typeof result.current.broadcast).toBe('function');
    expect(typeof result.current.isCustodial).toBe('boolean');
  });

  it('sets isCustodial=true for soft auth', () => {
    mockUseAuth.mockReturnValue({ authType: 'soft' });
    mockUseWallet.mockReturnValue(createMockWallet({ currentUser: null }));

    const { result } = renderHook(() => useBroadcast());

    expect(result.current.isCustodial).toBe(true);
  });

  it('sets isCustodial=false for hive auth', () => {
    mockUseAuth.mockReturnValue({ authType: 'hive' });
    mockUseWallet.mockReturnValue(createMockWallet());

    const { result } = renderHook(() => useBroadcast());

    expect(result.current.isCustodial).toBe(false);
  });

  it('sets isCustodial=false for guest auth', () => {
    mockUseAuth.mockReturnValue({ authType: 'guest' });
    mockUseWallet.mockReturnValue(createMockWallet({ currentUser: null }));

    const { result } = renderHook(() => useBroadcast());

    expect(result.current.isCustodial).toBe(false);
  });

  it('broadcast delegates to relay for soft auth', async () => {
    mockUseAuth.mockReturnValue({ authType: 'soft' });
    mockUseWallet.mockReturnValue(createMockWallet({ currentUser: null }));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { transactionId: 'relay-tx' } }),
    });

    const { result } = renderHook(() => useBroadcast());
    const broadcastResult = await result.current.broadcast(sampleOps);

    expect(broadcastResult).toEqual({ success: true, transactionId: 'relay-tx' });
    expect(mockFetch).toHaveBeenCalled();
  });

  it('broadcast delegates to wallet for hive auth', async () => {
    const mockWallet = createMockWallet();
    mockUseAuth.mockReturnValue({ authType: 'hive' });
    mockUseWallet.mockReturnValue(mockWallet);

    const { result } = renderHook(() => useBroadcast());
    const broadcastResult = await result.current.broadcast(sampleOps, 'active');

    expect(broadcastResult).toEqual({ success: true, transactionId: 'tx-456' });
    expect(mockWallet.signAndBroadcast).toHaveBeenCalledWith(sampleOps, 'active');
  });
});
