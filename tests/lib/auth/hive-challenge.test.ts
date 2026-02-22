/** @jest-environment node */

const mockGetAccounts = jest.fn();
const mockFromString = jest.fn();
const mockRecover = jest.fn();
const mockSha256 = jest.fn();

jest.mock('@hiveio/dhive', () => ({
  Signature: { fromString: (...args: unknown[]) => mockFromString(...args) },
  cryptoUtils: { sha256: (...args: unknown[]) => mockSha256(...args) },
  PublicKey: {},
  Client: jest.fn().mockImplementation(() => ({
    database: { getAccounts: (...args: unknown[]) => mockGetAccounts(...args) },
  })),
}));

jest.mock('@/lib/hive-workerbee/nodes', () => ({
  HIVE_NODES: ['https://api.hive.blog'],
}));

import {
  createChallenge,
  verifyChallenge,
  verifyHivePostingSignature,
} from '@/lib/auth/hive-challenge';

describe('hive-challenge', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-session-secret';
    jest.clearAllMocks();
  });

  // ── createChallenge ──────────────────────────────────────────────

  describe('createChallenge', () => {
    it('returns challenge in format sportsblock-auth:{username}:{nonce}:{timestamp}', () => {
      const { challenge } = createChallenge('alice');
      const parts = challenge.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('sportsblock-auth');
      expect(parts[1]).toBe('alice');
      // nonce should be 32 hex chars (16 bytes)
      expect(parts[2]).toMatch(/^[0-9a-f]{32}$/);
      // timestamp should be numeric
      expect(Number(parts[3])).not.toBeNaN();
    });

    it('produces different challenges on successive calls (random nonce)', () => {
      const a = createChallenge('alice');
      const b = createChallenge('alice');
      expect(a.challenge).not.toBe(b.challenge);
    });

    it('returns MAC as a 64-char hex string', () => {
      const { mac } = createChallenge('alice');
      expect(mac).toMatch(/^[0-9a-f]{64}$/);
    });

    it('embeds the provided username in the challenge', () => {
      const { challenge } = createChallenge('bob');
      expect(challenge.split(':')[1]).toBe('bob');
    });
  });

  // ── verifyChallenge ──────────────────────────────────────────────

  describe('verifyChallenge', () => {
    it('accepts a valid challenge + mac for the correct username', () => {
      const { challenge, mac } = createChallenge('alice');
      const result = verifyChallenge(challenge, mac, 'alice');
      expect(result).toEqual({ valid: true });
    });

    it('rejects a tampered MAC', () => {
      const { challenge, mac } = createChallenge('alice');
      // Flip the first hex character
      const firstChar = mac[0];
      const flipped = firstChar === '0' ? '1' : '0';
      const tamperedMac = flipped + mac.slice(1);

      const result = verifyChallenge(challenge, tamperedMac, 'alice');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid MAC');
    });

    it('rejects when username does not match', () => {
      const { challenge, mac } = createChallenge('alice');
      const result = verifyChallenge(challenge, mac, 'bob');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Challenge username mismatch');
    });

    it('rejects an expired challenge', () => {
      const { challenge, mac } = createChallenge('alice');

      // Advance Date.now by 6 minutes (past the 5-min TTL)
      const realDateNow = Date.now;
      Date.now = () => realDateNow() + 6 * 60 * 1000;

      try {
        const result = verifyChallenge(challenge, mac, 'alice');
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Challenge expired');
      } finally {
        Date.now = realDateNow;
      }
    });

    it('rejects invalid challenge format – wrong prefix', () => {
      const result = verifyChallenge('bad-prefix:alice:nonce:123', 'abcd', 'alice');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid challenge format');
    });

    it('rejects invalid challenge format – wrong number of parts', () => {
      const result = verifyChallenge('sportsblock-auth:alice', 'abcd', 'alice');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid challenge format');
    });

    it('rejects MAC of different length', () => {
      const { challenge } = createChallenge('alice');
      // A short MAC will have a different buffer length than expected 32 bytes
      const shortMac = 'aabb';
      const result = verifyChallenge(challenge, shortMac, 'alice');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid MAC');
    });
  });

  // ── verifyHivePostingSignature ───────────────────────────────────

  describe('verifyHivePostingSignature', () => {
    const challenge = 'sportsblock-auth:alice:abc123:1700000000000';
    const signatureHex = 'deadbeef';
    const fakeHash = Buffer.from('hash');
    const fakePublicKey = 'STM7abc123';

    beforeEach(() => {
      mockSha256.mockReturnValue(fakeHash);
      mockFromString.mockReturnValue({
        recover: mockRecover,
      });
      mockRecover.mockReturnValue({
        toString: () => fakePublicKey,
      });
    });

    it('returns valid when recovered key matches an on-chain posting key', async () => {
      mockGetAccounts.mockResolvedValue([
        {
          posting: {
            key_auths: [[fakePublicKey, 1]],
          },
        },
      ]);

      const result = await verifyHivePostingSignature(challenge, signatureHex, 'alice');
      expect(result).toEqual({ valid: true });
      expect(mockSha256).toHaveBeenCalledWith(challenge);
      expect(mockFromString).toHaveBeenCalledWith(signatureHex);
      expect(mockRecover).toHaveBeenCalledWith(fakeHash);
    });

    it('returns invalid when recovered key does not match any posting key', async () => {
      mockGetAccounts.mockResolvedValue([
        {
          posting: {
            key_auths: [['STM7different', 1]],
          },
        },
      ]);

      const result = await verifyHivePostingSignature(challenge, signatureHex, 'alice');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Signature does not match any posting key on account');
    });

    it('returns invalid when account is not found', async () => {
      mockGetAccounts.mockResolvedValue([]);

      const result = await verifyHivePostingSignature(challenge, signatureHex, 'alice');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Account not found on chain');
    });

    it('returns invalid when account has no posting key_auths', async () => {
      mockGetAccounts.mockResolvedValue([
        {
          posting: {
            key_auths: [],
          },
        },
      ]);

      const result = await verifyHivePostingSignature(challenge, signatureHex, 'alice');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('No posting keys found on account');
    });

    it('returns reason with error message when Signature.fromString throws', async () => {
      mockFromString.mockImplementation(() => {
        throw new Error('Invalid signature format');
      });

      const result = await verifyHivePostingSignature(challenge, signatureHex, 'alice');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Signature verification failed: Invalid signature format');
    });

    it('calls sha256 then recover in the correct chain', async () => {
      mockGetAccounts.mockResolvedValue([
        {
          posting: {
            key_auths: [[fakePublicKey, 1]],
          },
        },
      ]);

      await verifyHivePostingSignature(challenge, signatureHex, 'alice');

      // sha256 called with the raw challenge string
      expect(mockSha256).toHaveBeenCalledWith(challenge);
      // fromString called with the signature hex
      expect(mockFromString).toHaveBeenCalledWith(signatureHex);
      // recover called with the hash produced by sha256
      expect(mockRecover).toHaveBeenCalledWith(fakeHash);
      // getAccounts called with the username
      expect(mockGetAccounts).toHaveBeenCalledWith(['alice']);
    });
  });
});
