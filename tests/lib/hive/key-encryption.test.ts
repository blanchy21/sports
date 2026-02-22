/** @jest-environment node */

import { encryptKeys, decryptKeys } from '@/lib/hive/key-encryption';

const TEST_SECRET = 'test-secret-for-unit-tests';

const REALISTIC_KEYS_JSON = JSON.stringify({
  owner: '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3',
  active: '5JNHfZYKGaomSFvd4NUdQ9qMcEAC43kujbfjueTHpVN3FNj18pm',
  posting: '5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg',
  memo: '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ',
});

describe('key-encryption', () => {
  beforeEach(() => {
    process.env.KEY_ENCRYPTION_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    process.env.KEY_ENCRYPTION_SECRET = TEST_SECRET;
  });

  describe('round-trip encrypt/decrypt', () => {
    it('encrypts and decrypts a realistic keys JSON payload', () => {
      const { encrypted, iv, salt } = encryptKeys(REALISTIC_KEYS_JSON);
      const decrypted = decryptKeys(encrypted, iv, salt);

      expect(decrypted).toBe(REALISTIC_KEYS_JSON);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(REALISTIC_KEYS_JSON));
    });

    it('encrypts and decrypts an empty string', () => {
      const { encrypted, iv, salt } = encryptKeys('');
      const decrypted = decryptKeys(encrypted, iv, salt);

      expect(decrypted).toBe('');
    });

    it('round-trips a large payload (~10KB)', () => {
      const largePayload = JSON.stringify({
        data: 'x'.repeat(10_000),
        nested: { key: 'value'.repeat(200) },
      });

      const { encrypted, iv, salt } = encryptKeys(largePayload);
      const decrypted = decryptKeys(encrypted, iv, salt);

      expect(decrypted).toBe(largePayload);
    });

    it('round-trips unicode content', () => {
      const unicodePayload = JSON.stringify({
        name: 'Testy McTestface',
        bio: 'Sports fan from Sao Paulo, Brasil',
        emoji: 'Goal! Touchdown! Home run!',
        japanese: '\u30B5\u30C3\u30AB\u30FC\u304C\u5927\u597D\u304D',
        arabic: '\u0643\u0631\u0629 \u0627\u0644\u0642\u062F\u0645',
        accented: '\u00E9\u00E8\u00EA\u00EB\u00F1\u00FC\u00F6\u00E4',
      });

      const { encrypted, iv, salt } = encryptKeys(unicodePayload);
      const decrypted = decryptKeys(encrypted, iv, salt);

      expect(decrypted).toBe(unicodePayload);
    });
  });

  describe('randomness', () => {
    it('produces different ciphertexts for the same plaintext', () => {
      const result1 = encryptKeys(REALISTIC_KEYS_JSON);
      const result2 = encryptKeys(REALISTIC_KEYS_JSON);

      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.salt).not.toBe(result2.salt);
    });
  });

  describe('tamper detection', () => {
    it('throws when a byte in the encrypted output is flipped', () => {
      const { encrypted, iv, salt } = encryptKeys(REALISTIC_KEYS_JSON);

      const tampered = Buffer.from(encrypted, 'base64');
      // Flip a byte in the middle of the ciphertext (before the auth tag)
      tampered[Math.floor(tampered.length / 2)] ^= 0xff;
      const tamperedB64 = tampered.toString('base64');

      expect(() => decryptKeys(tamperedB64, iv, salt)).toThrow();
    });
  });

  describe('wrong secret', () => {
    it('fails decryption with a different KEY_ENCRYPTION_SECRET', () => {
      const { encrypted, iv, salt } = encryptKeys(REALISTIC_KEYS_JSON);

      process.env.KEY_ENCRYPTION_SECRET = 'wrong-secret-completely-different';

      expect(() => decryptKeys(encrypted, iv, salt)).toThrow();
    });
  });

  describe('corrupted input', () => {
    it('throws on truncated base64 encrypted data', () => {
      const { encrypted, iv, salt } = encryptKeys(REALISTIC_KEYS_JSON);

      // Truncate to just a few bytes -- too short for valid auth tag extraction
      const truncated = Buffer.from(encrypted, 'base64').subarray(0, 4).toString('base64');

      expect(() => decryptKeys(truncated, iv, salt)).toThrow();
    });

    it('throws on invalid base64 iv', () => {
      const { encrypted, salt } = encryptKeys(REALISTIC_KEYS_JSON);

      // Provide a wrong-length IV (not 16 bytes)
      const badIv = Buffer.from('short').toString('base64');

      expect(() => decryptKeys(encrypted, badIv, salt)).toThrow();
    });
  });

  describe('legacy salt fallback', () => {
    it('fails when salt param is omitted (mismatched random vs legacy salt)', () => {
      const { encrypted, iv } = encryptKeys(REALISTIC_KEYS_JSON);

      // encryptKeys uses a random salt, but omitting the salt param in
      // decryptKeys falls back to the static legacy salt -- they won't match
      expect(() => decryptKeys(encrypted, iv)).toThrow();
    });

    it('succeeds when the correct salt is provided', () => {
      const { encrypted, iv, salt } = encryptKeys(REALISTIC_KEYS_JSON);

      const decrypted = decryptKeys(encrypted, iv, salt);
      expect(decrypted).toBe(REALISTIC_KEYS_JSON);
    });
  });

  describe('missing env var', () => {
    it('throws on encrypt when KEY_ENCRYPTION_SECRET is not set', () => {
      delete process.env.KEY_ENCRYPTION_SECRET;

      expect(() => encryptKeys(REALISTIC_KEYS_JSON)).toThrow(
        'KEY_ENCRYPTION_SECRET environment variable is required'
      );
    });

    it('throws on decrypt when KEY_ENCRYPTION_SECRET is not set', () => {
      const { encrypted, iv, salt } = encryptKeys(REALISTIC_KEYS_JSON);

      delete process.env.KEY_ENCRYPTION_SECRET;

      expect(() => decryptKeys(encrypted, iv, salt)).toThrow(
        'KEY_ENCRYPTION_SECRET environment variable is required'
      );
    });
  });
});
