import crypto from 'crypto';
import { signStakeToken, verifyStakeToken } from '@/lib/predictions/stake-token';

const VALID_DATA = {
  predictionId: 'pred-1',
  username: 'alice',
  outcomeId: 'out-1',
  amount: 50,
};

describe('stake-token', () => {
  beforeEach(() => {
    process.env.STAKE_TOKEN_SECRET = 'test-secret-for-unit-tests';
  });

  afterEach(() => {
    delete process.env.STAKE_TOKEN_SECRET;
    delete process.env.SESSION_ENCRYPTION_KEY;
    delete process.env.SESSION_SECRET;
  });

  describe('round-trip: sign then verify', () => {
    it('returns original data for a valid token', () => {
      const token = signStakeToken(VALID_DATA);
      const result = verifyStakeToken(token);

      expect(result).toEqual(VALID_DATA);
    });

    it('works with different amounts', () => {
      const data = { ...VALID_DATA, amount: 999.123 };
      const token = signStakeToken(data);
      expect(verifyStakeToken(token)).toEqual(data);
    });
  });

  describe('expiration', () => {
    it('returns null for expired token', () => {
      const token = signStakeToken(VALID_DATA);

      // Fast-forward past the 5-minute expiry
      jest.useFakeTimers();
      jest.setSystemTime(Date.now() + 6 * 60 * 1000);

      expect(verifyStakeToken(token)).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('tamper detection', () => {
    it('returns null for tampered payload', () => {
      const token = signStakeToken(VALID_DATA);
      const [payload, sig] = token.split('.');

      // Decode, tamper, re-encode
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      decoded.amount = 99999;
      const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64');

      expect(verifyStakeToken(`${tamperedPayload}.${sig}`)).toBeNull();
    });

    it('returns null for tampered signature', () => {
      const token = signStakeToken(VALID_DATA);
      const [payload] = token.split('.');

      // Replace last 4 hex chars
      const badSig = 'a'.repeat(64);
      expect(verifyStakeToken(`${payload}.${badSig}`)).toBeNull();
    });
  });

  describe('malformed tokens', () => {
    it('returns null for token with no dot', () => {
      expect(verifyStakeToken('nodothere')).toBeNull();
    });

    it('returns null for token with extra dots', () => {
      expect(verifyStakeToken('a.b.c')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(verifyStakeToken('')).toBeNull();
    });

    it('returns null for garbage base64', () => {
      // Valid format (has one dot) but invalid content
      expect(verifyStakeToken('not-base64.not-hex')).toBeNull();
    });
  });

  describe('missing payload fields', () => {
    it('returns null when predictionId is missing', () => {
      const token = signStakeToken(VALID_DATA);
      const [payload] = token.split('.');

      // Decode, remove field, re-encode, re-sign
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      delete decoded.predictionId;

      // Sign with the secret to produce a valid signature for the broken payload

      const brokenPayload = Buffer.from(JSON.stringify(decoded)).toString('base64');
      const sig = crypto
        .createHmac('sha256', process.env.STAKE_TOKEN_SECRET!)
        .update(brokenPayload)
        .digest('hex');

      expect(verifyStakeToken(`${brokenPayload}.${sig}`)).toBeNull();
    });

    it('returns null when amount is a string instead of number', () => {
      const payload = Buffer.from(
        JSON.stringify({
          predictionId: 'pred-1',
          username: 'alice',
          outcomeId: 'out-1',
          amount: 'not-a-number',
          exp: Date.now() + 60000,
        })
      ).toString('base64');
      const sig = crypto
        .createHmac('sha256', process.env.STAKE_TOKEN_SECRET!)
        .update(payload)
        .digest('hex');

      expect(verifyStakeToken(`${payload}.${sig}`)).toBeNull();
    });
  });

  describe('secret fallback', () => {
    it('falls back to SESSION_ENCRYPTION_KEY', () => {
      delete process.env.STAKE_TOKEN_SECRET;
      process.env.SESSION_ENCRYPTION_KEY = 'fallback-key-1';

      const token = signStakeToken(VALID_DATA);
      expect(verifyStakeToken(token)).toEqual(VALID_DATA);
    });

    it('falls back to SESSION_SECRET', () => {
      delete process.env.STAKE_TOKEN_SECRET;
      process.env.SESSION_SECRET = 'fallback-key-2';

      const token = signStakeToken(VALID_DATA);
      expect(verifyStakeToken(token)).toEqual(VALID_DATA);
    });

    it('uses dev fallback in non-production when no secret set', () => {
      delete process.env.STAKE_TOKEN_SECRET;
      delete process.env.SESSION_ENCRYPTION_KEY;
      delete process.env.SESSION_SECRET;

      // Should not throw in test environment (NODE_ENV=test)
      const token = signStakeToken(VALID_DATA);
      expect(verifyStakeToken(token)).toEqual(VALID_DATA);
    });

    it('throws in production when no secret set', () => {
      delete process.env.STAKE_TOKEN_SECRET;
      delete process.env.SESSION_ENCRYPTION_KEY;
      delete process.env.SESSION_SECRET;

      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

      try {
        expect(() => signStakeToken(VALID_DATA)).toThrow(
          'STAKE_TOKEN_SECRET, SESSION_ENCRYPTION_KEY, or SESSION_SECRET is required in production'
        );
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
      }
    });
  });
});
