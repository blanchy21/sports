/**
 * HiveSigner wallet integration tests.
 *
 * Tests token management, URL construction, broadcast logic, and the
 * sign-popup postMessage flow. All browser APIs (localStorage, fetch,
 * window.open, postMessage) are mocked.
 */

import type { HiveOperation } from '@/types/hive-operations';

// ---------------------------------------------------------------------------
// Mock localStorage / sessionStorage
// ---------------------------------------------------------------------------

let store: Record<string, string> = {};
let sessionStore: Record<string, string> = {};

const localStorageMock = {
  getItem: jest.fn((key: string) => store[key] ?? null),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
  }),
  clear: jest.fn(() => {
    store = {};
  }),
};

const sessionStorageMock = {
  getItem: jest.fn((key: string) => sessionStore[key] ?? null),
  setItem: jest.fn((key: string, value: string) => {
    sessionStore[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete sessionStore[key];
  }),
  clear: jest.fn(() => {
    sessionStore = {};
  }),
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, writable: true });

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Mock window.open and postMessage machinery
// ---------------------------------------------------------------------------

let popupClosed = false;
const mockPopup = {
  get closed() {
    return popupClosed;
  },
  close: jest.fn(),
};

const mockWindowOpen = jest.fn().mockReturnValue(mockPopup);
Object.defineProperty(global, 'open', { value: mockWindowOpen, writable: true });
// window.open delegates to global.open in jsdom
jest.spyOn(window, 'open').mockImplementation(mockWindowOpen);

// Track message listeners so we can simulate postMessage
let messageListeners: ((event: MessageEvent) => void)[] = [];
const origAddEventListener = window.addEventListener.bind(window);
const origRemoveEventListener = window.removeEventListener.bind(window);
jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, ...rest) => {
  if (type === 'message') {
    messageListeners.push(listener as (event: MessageEvent) => void);
  }
  return origAddEventListener(type, listener, ...rest);
});
jest.spyOn(window, 'removeEventListener').mockImplementation((type, listener, ...rest) => {
  if (type === 'message') {
    messageListeners = messageListeners.filter((l) => l !== listener);
  }
  return origRemoveEventListener(type, listener, ...rest);
});

function simulatePostMessage(data: unknown) {
  const event = new MessageEvent('message', {
    data,
    origin: window.location.origin,
  });
  // Dispatch to all registered listeners AND the native handler
  window.dispatchEvent(event);
}

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import {
  storeHivesignerToken,
  getHivesignerToken,
  getHivesignerUsername,
  isHivesignerTokenValid,
  clearHivesignerSession,
  hivesignerLogin,
  hivesignerBroadcast,
  hivesignerSignPopup,
} from '@/lib/wallet/hivesigner';

// ---------------------------------------------------------------------------
// Reset state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  store = {};
  sessionStore = {};
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockWindowOpen.mockReturnValue(mockPopup);
  popupClosed = false;
  messageListeners = [];
});

// =========================================================================
// Token Management
// =========================================================================

describe('HiveSigner token management', () => {
  describe('storeHivesignerToken', () => {
    it('stores token, username, and expiry in localStorage', () => {
      storeHivesignerToken('tok_abc', 'alice', 1700000000000);

      expect(store['hs_token']).toBe('tok_abc');
      expect(store['hs_username']).toBe('alice');
      expect(store['hs_expiry']).toBe('1700000000000');
    });

    it('stores without expiry when not provided', () => {
      storeHivesignerToken('tok_abc', 'alice');

      expect(store['hs_token']).toBe('tok_abc');
      expect(store['hs_username']).toBe('alice');
      expect(store['hs_expiry']).toBeUndefined();
    });
  });

  describe('getHivesignerToken', () => {
    it('returns stored token', () => {
      store['hs_token'] = 'tok_123';
      expect(getHivesignerToken()).toBe('tok_123');
    });

    it('returns null when no token stored', () => {
      expect(getHivesignerToken()).toBeNull();
    });

    it('migrates legacy sessionStorage token to localStorage', () => {
      sessionStore['hivesignerToken'] = 'legacy_tok';
      sessionStore['hivesignerUsername'] = 'bob';
      sessionStore['hivesignerExpiry'] = '1700000000000';

      const token = getHivesignerToken();

      expect(token).toBe('legacy_tok');
      expect(store['hs_token']).toBe('legacy_tok');
      expect(store['hs_username']).toBe('bob');
      expect(store['hs_expiry']).toBe('1700000000000');
      // Legacy keys should be cleaned up
      expect(sessionStore['hivesignerToken']).toBeUndefined();
    });

    it('does not overwrite existing localStorage token with legacy', () => {
      store['hs_token'] = 'current_tok';
      sessionStore['hivesignerToken'] = 'old_legacy_tok';

      expect(getHivesignerToken()).toBe('current_tok');
    });
  });

  describe('getHivesignerUsername', () => {
    it('returns stored username', () => {
      store['hs_username'] = 'charlie';
      expect(getHivesignerUsername()).toBe('charlie');
    });

    it('returns null when no username stored', () => {
      expect(getHivesignerUsername()).toBeNull();
    });
  });

  describe('isHivesignerTokenValid', () => {
    it('returns true when token exists and not expired', () => {
      store['hs_token'] = 'tok';
      store['hs_expiry'] = String(Date.now() + 3600000);
      expect(isHivesignerTokenValid()).toBe(true);
    });

    it('returns false when token is expired', () => {
      store['hs_token'] = 'tok';
      store['hs_expiry'] = String(Date.now() - 1000);
      expect(isHivesignerTokenValid()).toBe(false);
    });

    it('returns true when token exists but no expiry set', () => {
      store['hs_token'] = 'tok';
      expect(isHivesignerTokenValid()).toBe(true);
    });

    it('returns false when no token stored', () => {
      expect(isHivesignerTokenValid()).toBe(false);
    });
  });

  describe('clearHivesignerSession', () => {
    it('clears all localStorage and sessionStorage keys', () => {
      store['hs_token'] = 'tok';
      store['hs_username'] = 'alice';
      store['hs_expiry'] = '123';
      sessionStore['hivesignerToken'] = 'old';
      sessionStore['hivesignerUsername'] = 'old_user';

      clearHivesignerSession();

      expect(store['hs_token']).toBeUndefined();
      expect(store['hs_username']).toBeUndefined();
      expect(store['hs_expiry']).toBeUndefined();
      expect(sessionStore['hivesignerToken']).toBeUndefined();
    });
  });
});

// =========================================================================
// hivesignerBroadcast — posting-key operations via API
// =========================================================================

describe('hivesignerBroadcast', () => {
  const sampleOps: HiveOperation[] = [
    [
      'custom_json',
      {
        required_auths: [],
        required_posting_auths: ['alice'],
        id: 'community',
        json: '{"subscribe":"hive-115814"}',
      },
    ],
  ];

  it('broadcasts successfully with valid token', async () => {
    store['hs_token'] = 'valid_token';
    store['hs_expiry'] = String(Date.now() + 3600000);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { id: 'tx_abc123' } }),
    });

    const result = await hivesignerBroadcast(sampleOps);

    expect(result).toEqual({ success: true, transactionId: 'tx_abc123' });
    expect(mockFetch).toHaveBeenCalledWith('https://hivesigner.com/api/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'valid_token',
      },
      body: JSON.stringify({ operations: sampleOps }),
    });
  });

  it('returns error on HiveSigner API error response', async () => {
    store['hs_token'] = 'valid_token';
    store['hs_expiry'] = String(Date.now() + 3600000);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Token has been revoked',
      }),
    });

    const result = await hivesignerBroadcast(sampleOps);

    expect(result).toEqual({ success: false, error: 'Token has been revoked' });
  });

  it('returns error on HTTP failure', async () => {
    store['hs_token'] = 'valid_token';
    store['hs_expiry'] = String(Date.now() + 3600000);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const result = await hivesignerBroadcast(sampleOps);

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain('500');
  });

  it('handles network errors gracefully', async () => {
    store['hs_token'] = 'valid_token';
    store['hs_expiry'] = String(Date.now() + 3600000);

    mockFetch.mockRejectedValue(new Error('Network offline'));

    const result = await hivesignerBroadcast(sampleOps);

    expect(result).toEqual({ success: false, error: 'Network offline' });
  });

  it('extracts txId from result.id when result.result.id is missing', async () => {
    store['hs_token'] = 'valid_token';
    store['hs_expiry'] = String(Date.now() + 3600000);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'tx_from_id_field' }),
    });

    const result = await hivesignerBroadcast(sampleOps);

    expect(result).toEqual({ success: true, transactionId: 'tx_from_id_field' });
  });

  it('falls back to "unknown" txId when neither result.id nor result.result.id exist', async () => {
    store['hs_token'] = 'valid_token';
    store['hs_expiry'] = String(Date.now() + 3600000);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await hivesignerBroadcast(sampleOps);

    expect(result).toEqual({ success: true, transactionId: 'unknown' });
  });
});

// =========================================================================
// hivesignerSignPopup — active-key signing via popup
// =========================================================================

describe('hivesignerSignPopup', () => {
  const activeKeyOps: HiveOperation[] = [
    [
      'custom_json',
      {
        required_auths: ['alice'],
        required_posting_auths: [],
        id: 'ssc-mainnet-hive',
        json: JSON.stringify({
          contractName: 'tokens',
          contractAction: 'transfer',
          contractPayload: {
            symbol: 'MEDALS',
            to: 'sp-predictions',
            quantity: '50.000',
            memo: 'prediction-stake|pred-1|out-1',
          },
        }),
      },
    ],
  ];

  it('returns error for empty operations', async () => {
    const result = await hivesignerSignPopup([]);

    expect(result).toEqual({ success: false, error: 'No operations to sign' });
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  it('returns error when popup is blocked', async () => {
    mockWindowOpen.mockReturnValue(null);

    const result = await hivesignerSignPopup(activeKeyOps);

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain('popup');
  });

  it('opens popup with correct sign URL for active-key custom_json', async () => {
    const promise = hivesignerSignPopup(activeKeyOps);

    // Simulate successful sign callback
    simulatePostMessage({
      source: 'hivesigner-sign-callback',
      success: true,
      transactionId: 'tx_signed_123',
    });

    const result = await promise;

    expect(result).toEqual({ success: true, transactionId: 'tx_signed_123' });

    // Verify the URL includes authority=active and required_auths
    const openedUrl = mockWindowOpen.mock.calls[0][0] as string;
    expect(openedUrl).toContain('hivesigner.com/sign/custom_json');
    expect(openedUrl).toContain('authority=active');
    expect(openedUrl).toContain(encodeURIComponent('alice'));
  });

  it('includes hive-uri template syntax in redirect URL', async () => {
    const promise = hivesignerSignPopup(activeKeyOps);

    simulatePostMessage({
      source: 'hivesigner-sign-callback',
      success: true,
      transactionId: 'tx_123',
    });

    await promise;

    const openedUrl = mockWindowOpen.mock.calls[0][0] as string;
    // The redirect_uri should contain {{id}} and {{block}} templates
    expect(openedUrl).toContain(encodeURIComponent('{{id}}'));
    expect(openedUrl).toContain(encodeURIComponent('{{block}}'));
  });

  it('resolves with error when callback reports failure', async () => {
    const promise = hivesignerSignPopup(activeKeyOps);

    simulatePostMessage({
      source: 'hivesigner-sign-callback',
      success: false,
      error: 'User denied the transaction',
    });

    const result = await promise;

    expect(result).toEqual({ success: false, error: 'User denied the transaction' });
  });

  it('resolves with error when popup is closed without completing', async () => {
    jest.useFakeTimers();

    const promise = hivesignerSignPopup(activeKeyOps);

    // Simulate popup being closed by user
    popupClosed = true;

    // Advance past the poll interval
    jest.advanceTimersByTime(1500);

    const result = await promise;

    expect(result).toEqual({
      success: false,
      error: 'HiveSigner signing popup was closed',
    });

    jest.useRealTimers();
  });

  it('ignores postMessages from wrong origin', async () => {
    jest.useFakeTimers();

    const promise = hivesignerSignPopup(activeKeyOps);

    // Send a message from a different origin — won't trigger because we
    // check event.origin. Simulate by dispatching directly (won't match).
    const badEvent = new MessageEvent('message', {
      data: {
        source: 'hivesigner-sign-callback',
        success: true,
        transactionId: 'spoofed',
      },
      origin: 'https://evil.com',
    });
    window.dispatchEvent(badEvent);

    // Close popup to resolve
    popupClosed = true;
    jest.advanceTimersByTime(1500);

    const result = await promise;

    // Should NOT have resolved with the spoofed tx
    expect(result.success).toBe(false);

    jest.useRealTimers();
  });

  it('ignores postMessages with wrong source tag', async () => {
    jest.useFakeTimers();

    const promise = hivesignerSignPopup(activeKeyOps);

    // Send a message with wrong source
    simulatePostMessage({
      source: 'some-other-callback',
      success: true,
      transactionId: 'wrong_source',
    });

    // Close popup to resolve
    popupClosed = true;
    jest.advanceTimersByTime(1500);

    const result = await promise;

    expect(result.success).toBe(false);

    jest.useRealTimers();
  });

  it('handles placeholder txId from HiveSigner (hivesigner-signed)', async () => {
    const promise = hivesignerSignPopup(activeKeyOps);

    // HiveSigner didn't return a real txId — callback sends placeholder
    simulatePostMessage({
      source: 'hivesigner-sign-callback',
      success: true,
      transactionId: 'hivesigner-signed',
    });

    const result = await promise;

    // Should still resolve as success — verify-stake handles the fallback
    expect(result).toEqual({ success: true, transactionId: 'hivesigner-signed' });
  });
});

// =========================================================================
// buildSignURL — URL construction
// =========================================================================

describe('buildSignURL (via hivesignerSignPopup URL inspection)', () => {
  it('sets authority=active when required_auths is populated', async () => {
    const ops: HiveOperation[] = [
      [
        'custom_json',
        {
          required_auths: ['alice'],
          required_posting_auths: [],
          id: 'ssc-mainnet-hive',
          json: '{}',
        },
      ],
    ];

    const promise = hivesignerSignPopup(ops);
    simulatePostMessage({
      source: 'hivesigner-sign-callback',
      success: true,
      transactionId: 'tx',
    });
    await promise;

    const url = mockWindowOpen.mock.calls[0][0] as string;
    expect(url).toContain('authority=active');
  });

  it('does not set authority=active for posting-key ops', async () => {
    const ops: HiveOperation[] = [
      [
        'custom_json',
        {
          required_auths: [],
          required_posting_auths: ['alice'],
          id: 'community',
          json: '{}',
        },
      ],
    ];

    const promise = hivesignerSignPopup(ops);
    simulatePostMessage({
      source: 'hivesigner-sign-callback',
      success: true,
      transactionId: 'tx',
    });
    await promise;

    const url = mockWindowOpen.mock.calls[0][0] as string;
    expect(url).not.toContain('authority=active');
  });

  it('encodes JSON payload in the sign URL', async () => {
    const payload = JSON.stringify({ contractName: 'tokens', contractAction: 'transfer' });
    const ops: HiveOperation[] = [
      [
        'custom_json',
        {
          required_auths: ['alice'],
          required_posting_auths: [],
          id: 'ssc-mainnet-hive',
          json: payload,
        },
      ],
    ];

    const promise = hivesignerSignPopup(ops);
    simulatePostMessage({
      source: 'hivesigner-sign-callback',
      success: true,
      transactionId: 'tx',
    });
    await promise;

    const url = mockWindowOpen.mock.calls[0][0] as string;
    // The json param should be URL-encoded in the query string
    const urlObj = new URL(url);
    expect(urlObj.searchParams.get('json')).toBe(payload);
  });
});
