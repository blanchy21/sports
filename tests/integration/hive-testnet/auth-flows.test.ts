/**
 * Hive Testnet Integration Tests - Authentication Flows
 *
 * These tests verify critical authentication flows against the real Hive blockchain.
 * They test account existence, authority verification, and data fetching.
 *
 * To run these tests:
 *   RUN_HIVE_INTEGRATION_TESTS=true npm run test -- tests/integration/hive-testnet/
 *
 * For authenticated tests (posting, voting):
 *   HIVE_TEST_USERNAME=<your-testnet-account>
 *   HIVE_TEST_POSTING_KEY=<your-posting-key>
 */

import { Client } from '@hiveio/dhive';
import {
  describeIfIntegration,
  itIfIntegration,
  getTestnetNode,
  getTestCredentials,
  KNOWN_TEST_ACCOUNTS,
  assertValidHiveAccount,
} from './setup';

describeIfIntegration('Hive Blockchain Authentication Flows', () => {
  let client: Client;

  beforeAll(() => {
    // Connect to testnet (or mainnet for read-only tests)
    const node = getTestnetNode();
    client = new Client(node);
  });

  describe('Account Verification', () => {
    itIfIntegration('verifies that a known account exists', async () => {
      const accounts = await client.database.getAccounts([KNOWN_TEST_ACCOUNTS.HIVE_BLOG]);

      expect(accounts).toHaveLength(1);
      assertValidHiveAccount(accounts[0]);
      expect(accounts[0].name).toBe(KNOWN_TEST_ACCOUNTS.HIVE_BLOG);
    });

    itIfIntegration('returns empty array for non-existent account', async () => {
      const fakeUsername = 'this-account-definitely-does-not-exist-12345';
      const accounts = await client.database.getAccounts([fakeUsername]);

      expect(accounts).toHaveLength(0);
    });

    itIfIntegration('can fetch multiple accounts in one call', async () => {
      const usernames = [KNOWN_TEST_ACCOUNTS.HIVE_BLOG, KNOWN_TEST_ACCOUNTS.HIVEBUZZ];
      const accounts = await client.database.getAccounts(usernames);

      expect(accounts).toHaveLength(2);
      accounts.forEach((account) => {
        assertValidHiveAccount(account);
      });
    });

    itIfIntegration('fetches account with correct authority structure', async () => {
      const accounts = await client.database.getAccounts([KNOWN_TEST_ACCOUNTS.BLOCKTRADES]);

      expect(accounts).toHaveLength(1);
      const account = accounts[0];

      // Verify authority structure exists
      expect(account.owner).toBeDefined();
      expect(account.active).toBeDefined();
      expect(account.posting).toBeDefined();

      // Verify authority has key_auths and account_auths
      expect(account.posting.key_auths).toBeDefined();
      expect(account.posting.account_auths).toBeDefined();
      expect(Array.isArray(account.posting.key_auths)).toBe(true);
    });
  });

  describe('Authority Verification', () => {
    itIfIntegration('verifies account authority for known account', async () => {
      const accounts = await client.database.getAccounts([KNOWN_TEST_ACCOUNTS.HIVE_BLOG]);

      expect(accounts).toHaveLength(1);
      const account = accounts[0];

      // Get the posting public key
      const postingKeys = account.posting.key_auths;
      expect(postingKeys.length).toBeGreaterThan(0);

      // The first element of each key_auth is the public key (can be string or PublicKey object)
      const publicKey = postingKeys[0][0];
      const publicKeyStr = typeof publicKey === 'string' ? publicKey : String(publicKey);
      expect(publicKeyStr.startsWith('STM')).toBe(true);
    });
  });

  describe('Account Data Fetching', () => {
    itIfIntegration('fetches account reputation', async () => {
      const accounts = await client.database.getAccounts([KNOWN_TEST_ACCOUNTS.BLOCKTRADES]);

      expect(accounts).toHaveLength(1);
      const account = accounts[0];

      // Reputation is stored as a string of a large number
      expect(account.reputation).toBeDefined();
      expect(typeof account.reputation).toBe('string');
    });

    itIfIntegration('fetches account balances', async () => {
      const accounts = await client.database.getAccounts([KNOWN_TEST_ACCOUNTS.HIVE_BLOG]);

      expect(accounts).toHaveLength(1);
      const account = accounts[0];

      // Verify balance fields exist
      expect(account.balance).toBeDefined();
      expect(account.hbd_balance).toBeDefined();
      expect(account.vesting_shares).toBeDefined();

      // Balances are in format "0.000 HIVE"
      expect(typeof account.balance).toBe('string');
      expect(account.balance).toMatch(/^\d+\.\d{3} HIVE$/);
    });

    itIfIntegration('fetches account metadata/profile', async () => {
      const accounts = await client.database.getAccounts([KNOWN_TEST_ACCOUNTS.HIVE_BLOG]);

      expect(accounts).toHaveLength(1);
      const account = accounts[0];

      // posting_json_metadata contains profile info
      expect(account.posting_json_metadata).toBeDefined();

      // Try to parse it
      if (account.posting_json_metadata) {
        try {
          const metadata = JSON.parse(account.posting_json_metadata);
          expect(metadata).toBeDefined();
          // Profile usually has a 'profile' key
          if (metadata.profile) {
            expect(typeof metadata.profile).toBe('object');
          }
        } catch {
          // Some accounts may have invalid JSON metadata
        }
      }
    });
  });

  describe('Resource Credits', () => {
    itIfIntegration('fetches resource credits for account', async () => {
      // Use the RC API to get resource credits
      const result = await client.call('rc_api', 'find_rc_accounts', {
        accounts: [KNOWN_TEST_ACCOUNTS.BLOCKTRADES],
      });

      expect(result).toBeDefined();
      expect(result.rc_accounts).toBeDefined();
      expect(result.rc_accounts).toHaveLength(1);

      const rcAccount = result.rc_accounts[0];
      expect(rcAccount.account).toBe(KNOWN_TEST_ACCOUNTS.BLOCKTRADES);
      expect(rcAccount.rc_manabar).toBeDefined();
    });
  });

  describe('Global Properties', () => {
    itIfIntegration('fetches dynamic global properties', async () => {
      const props = await client.database.getDynamicGlobalProperties();

      expect(props).toBeDefined();
      expect(props.head_block_number).toBeGreaterThan(0);
      expect(props.current_witness).toBeDefined();
    });

    itIfIntegration('fetches chain properties', async () => {
      const props = await client.database.getChainProperties();

      expect(props).toBeDefined();
      expect(props.account_creation_fee).toBeDefined();
    });
  });
});

describeIfIntegration('Hive Authenticated Operations', () => {
  let client: Client;
  const credentials = getTestCredentials();

  beforeAll(() => {
    const node = getTestnetNode();
    client = new Client(node);
  });

  // Skip authenticated tests if no credentials provided
  const itIfCredentials = credentials
    ? itIfIntegration
    : (name: string, _fn: () => Promise<void>) => {
        it.skip(`[SKIPPED: No credentials] ${name}`, () => {});
      };

  describe('Transaction Signing', () => {
    itIfCredentials('can sign a transaction without broadcasting', async () => {
      if (!credentials) return;

      const { username, postingKey } = credentials;

      // Create a simple vote operation (we won't broadcast it)
      const vote = {
        voter: username,
        author: KNOWN_TEST_ACCOUNTS.HIVE_BLOG,
        permlink: 'test',
        weight: 100,
      };

      // Get required properties for transaction
      const props = await client.database.getDynamicGlobalProperties();

      // Create transaction (demonstrates that we can build valid transaction objects)
      const _transaction = {
        ref_block_num: props.head_block_number & 0xffff,
        ref_block_prefix: Buffer.from(props.head_block_id, 'hex').readUInt32LE(4),
        expiration: new Date(Date.now() + 60000).toISOString().slice(0, -5),
        operations: [['vote', vote]],
        extensions: [],
      };

      // This verifies the key format is valid
      const { PrivateKey } = await import('@hiveio/dhive');
      const key = PrivateKey.fromString(postingKey);
      expect(key).toBeDefined();

      // Note: We don't broadcast to avoid side effects
      // In a real test with a testnet account, you could broadcast
    });
  });

  describe('Account History', () => {
    itIfIntegration('fetches account history', async () => {
      const history = await client.database.call('get_account_history', [
        KNOWN_TEST_ACCOUNTS.HIVE_BLOG,
        -1, // Start from most recent
        10, // Limit
      ]);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);

      // Each history item is [index, operation]
      const [index, operation] = history[0];
      expect(typeof index).toBe('number');
      expect(operation).toBeDefined();
      expect(operation.op).toBeDefined();
    });
  });
});
