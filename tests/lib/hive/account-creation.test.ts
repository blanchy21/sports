/** @jest-environment node */

const mockGetAccounts = jest.fn();
const mockSendOperations = jest.fn();

jest.mock('@hiveio/dhive', () => ({
  Client: jest.fn().mockImplementation(() => ({
    database: { getAccounts: (...args: unknown[]) => mockGetAccounts(...args) },
    broadcast: {
      sendOperations: (...args: unknown[]) => mockSendOperations(...args),
    },
  })),
  PrivateKey: {
    fromString: jest.fn().mockReturnValue('mock-key'),
    fromLogin: jest.fn().mockReturnValue({
      toString: () => '5JmockPrivateKey',
      createPublic: () => ({ toString: () => 'STMmockPublicKey' }),
    }),
  },
}));

jest.mock('@/lib/hive-workerbee/nodes', () => ({
  HIVE_NODES: ['https://api.hive.blog'],
}));

const mockIsValidHiveUsername = jest.fn();
const mockCheckUsernameAvailability = jest.fn();
jest.mock('@/lib/hive/username', () => ({
  isValidHiveUsername: (...args: unknown[]) => mockIsValidHiveUsername(...args),
  checkUsernameAvailability: (...args: unknown[]) => mockCheckUsernameAvailability(...args),
}));

const mockEncryptKeys = jest.fn();
jest.mock('@/lib/hive/key-encryption', () => ({
  encryptKeys: (...args: unknown[]) => mockEncryptKeys(...args),
}));

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    custodialUser: { update: jest.fn() },
    accountToken: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  createHiveAccountForUser,
  checkAvailableTokens,
  delegateRcToUser,
  AccountCreationError,
} from '@/lib/hive/account-creation';
import { PrivateKey } from '@hiveio/dhive';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

describe('account-creation', () => {
  const TEST_USERNAME = 'sb-testuser';
  const TEST_USER_ID = 'custodial-user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.OPERATIONS_ACTIVE_KEY = 'fake-active-key';

    // Default happy-path mocks
    mockIsValidHiveUsername.mockReturnValue({ valid: true });
    mockCheckUsernameAvailability.mockResolvedValue(true);
    mockGetAccounts.mockResolvedValue([{ pending_claimed_accounts: 5 }]);
    mockSendOperations.mockResolvedValue({ id: 'mock-tx-id' });
    mockEncryptKeys.mockReturnValue({
      encrypted: 'enc',
      iv: 'iv',
      salt: 'salt',
    });
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    delete process.env.OPERATIONS_ACTIVE_KEY;
  });

  // ── Validation ──────────────────────────────────────────────────────

  describe('createHiveAccountForUser - validation', () => {
    it('throws when username does not start with sb-', async () => {
      await expect(createHiveAccountForUser('testuser', TEST_USER_ID)).rejects.toThrow(
        'Username must start with "sb-"'
      );
    });

    it('throws when username is invalid', async () => {
      mockIsValidHiveUsername.mockReturnValue({
        valid: false,
        reason: 'Username must be at least 3 characters',
      });

      await expect(createHiveAccountForUser('sb-ab', TEST_USER_ID)).rejects.toThrow(
        'Invalid username: Username must be at least 3 characters'
      );
    });

    it('throws when username is already taken', async () => {
      mockCheckUsernameAvailability.mockResolvedValue(false);

      await expect(createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID)).rejects.toThrow(
        `Username @${TEST_USERNAME} is already taken`
      );
    });

    it('throws when no account creation tokens are available', async () => {
      mockGetAccounts.mockResolvedValue([{ pending_claimed_accounts: 0 }]);

      await expect(createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID)).rejects.toThrow(
        'No account creation tokens available'
      );
    });

    it('throws when OPERATIONS_ACTIVE_KEY is not configured', async () => {
      delete process.env.OPERATIONS_ACTIVE_KEY;

      await expect(createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID)).rejects.toThrow(
        'OPERATIONS_ACTIVE_KEY is not configured'
      );
    });
  });

  // ── Success path ────────────────────────────────────────────────────

  describe('createHiveAccountForUser - success path', () => {
    it('broadcasts a create_claimed_account operation', async () => {
      await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID);

      // First sendOperations call is create_claimed_account
      const [ops] = mockSendOperations.mock.calls[0];
      expect(ops[0][0]).toBe('create_claimed_account');
      expect(ops[0][1]).toMatchObject({
        creator: 'niallon11',
        new_account_name: TEST_USERNAME,
      });
    });

    it('generates 4 key types via PrivateKey.fromLogin', async () => {
      await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID);

      const fromLogin = PrivateKey.fromLogin as jest.Mock;
      const roles = fromLogin.mock.calls.map((call: unknown[]) => call[2]);
      expect(roles).toEqual(expect.arrayContaining(['owner', 'active', 'posting', 'memo']));
      expect(fromLogin).toHaveBeenCalledTimes(4);
    });

    it('calls encryptKeys with JSON containing all keys and master', async () => {
      await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID);

      expect(mockEncryptKeys).toHaveBeenCalledTimes(1);
      const keysJson = JSON.parse(mockEncryptKeys.mock.calls[0][0]);
      expect(keysJson).toHaveProperty('master');
      expect(keysJson).toHaveProperty('owner', '5JmockPrivateKey');
      expect(keysJson).toHaveProperty('active', '5JmockPrivateKey');
      expect(keysJson).toHaveProperty('posting', '5JmockPrivateKey');
      expect(keysJson).toHaveProperty('memo', '5JmockPrivateKey');
    });

    it('stores encrypted keys in DB via $transaction', async () => {
      await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.custodialUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_USER_ID },
          data: expect.objectContaining({
            hiveUsername: TEST_USERNAME,
            encryptedKeys: 'enc',
            encryptionIv: 'iv',
            encryptionSalt: 'salt',
          }),
        })
      );
      expect(prisma.accountToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hiveUsername: TEST_USERNAME,
            status: 'CLAIMED',
            userId: TEST_USER_ID,
          }),
        })
      );
    });

    it('returns { hiveUsername } on success', async () => {
      const result = await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID);

      expect(result).toEqual({ hiveUsername: TEST_USERNAME });
    });
  });

  // ── RC delegation ───────────────────────────────────────────────────

  describe('createHiveAccountForUser - RC delegation', () => {
    it('still succeeds if RC delegation fails', async () => {
      // Make the second sendOperations call (RC delegation) fail
      mockSendOperations
        .mockResolvedValueOnce({ id: 'create-tx' }) // create_claimed_account
        .mockRejectedValueOnce(new Error('RC delegation network error')); // RC delegation

      const result = await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID);

      expect(result).toEqual({ hiveUsername: TEST_USERNAME });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('RC delegation'),
        'account-creation',
        expect.any(Object)
      );
    });

    it('logs success when RC delegation succeeds', async () => {
      await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('RC delegated'),
        'account-creation'
      );
    });
  });

  // ── Cascade failures ────────────────────────────────────────────────

  describe('createHiveAccountForUser - cascade failures', () => {
    it('throws AccountCreationError with ENCRYPTION_FAILED when encryption fails after broadcast', async () => {
      mockEncryptKeys.mockImplementation(() => {
        throw new Error('encryption boom');
      });

      await expect(createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID)).rejects.toThrow(
        AccountCreationError
      );

      try {
        await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID);
      } catch (err) {
        expect(err).toBeInstanceOf(AccountCreationError);
        expect((err as AccountCreationError).code).toBe('ENCRYPTION_FAILED');
      }
    });

    it('throws AccountCreationError with DB_SAVE_FAILED when DB fails after encryption', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

      await expect(createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID)).rejects.toThrow(
        AccountCreationError
      );

      try {
        await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID);
      } catch (err) {
        expect(err).toBeInstanceOf(AccountCreationError);
        expect((err as AccountCreationError).code).toBe('DB_SAVE_FAILED');
      }
    });

    it('logs CRITICAL error when encryption fails after broadcast', async () => {
      mockEncryptKeys.mockImplementation(() => {
        throw new Error('encryption boom');
      });

      await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID).catch(() => {});

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL'),
        'account-creation',
        expect.any(Error)
      );
    });

    it('logs CRITICAL error when DB fails after encryption', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

      await createHiveAccountForUser(TEST_USERNAME, TEST_USER_ID).catch(() => {});

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL'),
        'account-creation',
        expect.any(Error)
      );
    });
  });

  // ── checkAvailableTokens ───────────────────────────────────────────

  describe('checkAvailableTokens', () => {
    it('returns pending_claimed_accounts from creator account', async () => {
      mockGetAccounts.mockResolvedValue([{ pending_claimed_accounts: 42 }]);

      const result = await checkAvailableTokens();

      expect(result).toBe(42);
      expect(mockGetAccounts).toHaveBeenCalledWith(['niallon11']);
    });

    it('throws if creator account is not found', async () => {
      mockGetAccounts.mockResolvedValue([undefined]);

      await expect(checkAvailableTokens()).rejects.toThrow('Creator account @niallon11 not found');
    });
  });

  // ── delegateRcToUser ───────────────────────────────────────────────

  describe('delegateRcToUser', () => {
    it('throws when OPERATIONS_ACTIVE_KEY is not configured', async () => {
      delete process.env.OPERATIONS_ACTIVE_KEY;

      await expect(delegateRcToUser('sb-newuser')).rejects.toThrow(
        'OPERATIONS_ACTIVE_KEY is not configured'
      );
    });

    it('delegates 75B RC from ACCOUNT_CREATOR using active authority', async () => {
      await delegateRcToUser('sb-newuser');

      expect(mockSendOperations).toHaveBeenCalledTimes(1);
      const [ops] = mockSendOperations.mock.calls[0];
      const customJson = ops[0][1];

      expect(customJson.required_auths).toEqual(['niallon11']);
      expect(customJson.required_posting_auths).toEqual([]);

      const parsed = JSON.parse(customJson.json);
      expect(parsed[0]).toBe('delegate_rc');
      expect(parsed[1]).toEqual({
        from: 'niallon11',
        delegatees: ['sb-newuser'],
        max_rc: 75_000_000_000,
      });
    });
  });
});
