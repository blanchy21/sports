import crypto from 'crypto';
import { Client, PrivateKey } from '@hiveio/dhive';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';
import { isValidHiveUsername, checkUsernameAvailability } from './username';
import { encryptKeys } from './key-encryption';

const dhive = new Client(HIVE_NODES);

const ACCOUNT_CREATOR = process.env.ACCOUNT_CREATOR ?? 'niallon11';
const OPERATIONS_ACCOUNT = process.env.OPERATIONS_ACCOUNT ?? 'sp-blockrewards';
const RC_DELEGATION_AMOUNT = 5_000_000_000; // 5 billion RC

interface AccountCreationResult {
  hiveUsername: string;
}

export class AccountCreationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AccountCreationError';
    this.code = code;
  }
}

export async function checkAvailableTokens(): Promise<number> {
  const [account] = await dhive.database.getAccounts([ACCOUNT_CREATOR]);
  if (!account) {
    throw new Error(`Creator account @${ACCOUNT_CREATOR} not found`);
  }
  return (account as unknown as { pending_claimed_accounts: number }).pending_claimed_accounts;
}

export async function delegateRcToUser(username: string): Promise<void> {
  const operationsKey = process.env.OPERATIONS_POSTING_KEY;
  if (!operationsKey) {
    throw new Error('OPERATIONS_POSTING_KEY is not configured');
  }

  const rcDelegationOp: [string, object] = [
    'custom_json',
    {
      required_auths: [],
      required_posting_auths: [OPERATIONS_ACCOUNT],
      id: 'rc',
      json: JSON.stringify([
        'delegate_rc',
        {
          from: OPERATIONS_ACCOUNT,
          delegatees: [username],
          max_rc: RC_DELEGATION_AMOUNT,
        },
      ]),
    },
  ];

  const key = PrivateKey.fromString(operationsKey);
  await dhive.broadcast.sendOperations([rcDelegationOp as never], key);
}

export async function createHiveAccountForUser(
  username: string,
  custodialUserId: string
): Promise<AccountCreationResult> {
  // 1. Validate username
  const validation = isValidHiveUsername(username);
  if (!validation.valid) {
    throw new Error(`Invalid username: ${validation.reason}`);
  }

  const available = await checkUsernameAvailability(username);
  if (!available) {
    throw new Error(`Username @${username} is already taken`);
  }

  // 2. Check account creation tokens
  const pendingTokens = await checkAvailableTokens();
  if (pendingTokens <= 0) {
    throw new Error('No account creation tokens available. Please try again later.');
  }

  // 3. Get creator key
  const creatorActiveKey = process.env.OPERATIONS_ACTIVE_KEY;
  if (!creatorActiveKey) {
    throw new Error('OPERATIONS_ACTIVE_KEY is not configured');
  }

  // 4. Generate master password and derive keys
  const masterPassword = crypto.randomBytes(32).toString('hex');

  const ownerKey = PrivateKey.fromLogin(username, masterPassword, 'owner');
  const activeKey = PrivateKey.fromLogin(username, masterPassword, 'active');
  const postingKey = PrivateKey.fromLogin(username, masterPassword, 'posting');
  const memoKey = PrivateKey.fromLogin(username, masterPassword, 'memo');

  const ownerPublic = ownerKey.createPublic().toString();
  const activePublic = activeKey.createPublic().toString();
  const postingPublic = postingKey.createPublic().toString();
  const memoPublic = memoKey.createPublic().toString();

  // 5. Encrypt keys BEFORE broadcast — if encryption fails here, no on-chain action
  // has occurred yet so the error is recoverable.
  const keysPayload = JSON.stringify({
    master: masterPassword,
    owner: ownerKey.toString(),
    active: activeKey.toString(),
    posting: postingKey.toString(),
    memo: memoKey.toString(),
  });

  let encrypted: string;
  let iv: string;
  let salt: string;
  try {
    const encResult = encryptKeys(keysPayload);
    encrypted = encResult.encrypted;
    iv = encResult.iv;
    salt = encResult.salt;
  } catch (encryptError) {
    logger.error(
      `Key encryption failed before account creation for username @${username}. ` +
        `CustodialUser ID: ${custodialUserId}. No on-chain action taken.`,
      'account-creation',
      encryptError instanceof Error ? encryptError : undefined
    );
    throw new AccountCreationError(
      'Account setup failed during key preparation. Please try again.',
      'ENCRYPTION_FAILED'
    );
  }

  // 6. Broadcast create_claimed_account (keys are already encrypted above)
  const createOp: [string, object] = [
    'create_claimed_account',
    {
      creator: ACCOUNT_CREATOR,
      new_account_name: username,
      owner: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[ownerPublic, 1]],
      },
      active: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[activePublic, 1]],
      },
      posting: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[postingPublic, 1]],
      },
      memo_key: memoPublic,
      json_metadata: JSON.stringify({
        profile: {
          name: username,
          about: 'Created via Sportsblock',
          website: 'https://sportsblock.app',
        },
      }),
      extensions: [],
    },
  ];

  const signingKey = PrivateKey.fromString(creatorActiveKey);
  await dhive.broadcast.sendOperations([createOp as never], signingKey);

  logger.info(`Hive account @${username} created successfully`, 'account-creation');

  // 7. Delegate RC (non-fatal if this fails)
  let rcDelegated = true;
  try {
    await delegateRcToUser(username);
    logger.info(`RC delegated to @${username}`, 'account-creation');
  } catch (rcError) {
    rcDelegated = false;
    logger.warn(
      `RC delegation to @${username} failed — account exists but has no RC. Will need manual retry.`,
      'account-creation',
      {
        error: rcError instanceof Error ? rcError.message : String(rcError),
      }
    );
  }

  // 8. Update database — use updateMany with hiveUsername: null guard to prevent
  // double-writes from concurrent requests that both passed the null check above.
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.custodialUser.updateMany({
        where: { id: custodialUserId, hiveUsername: null },
        data: {
          hiveUsername: username,
          encryptedKeys: encrypted,
          encryptionIv: iv,
          encryptionSalt: salt,
        },
      });

      if (updated.count === 0) {
        // A concurrent request already wrote the hiveUsername — idempotent, not an error.
        logger.warn(
          `Account @${username} DB row already set for custodialUserId ${custodialUserId} — concurrent request resolved first.`,
          'account-creation'
        );
        return;
      }

      await tx.accountToken.create({
        data: {
          hiveUsername: username,
          status: 'CLAIMED',
          claimedAt: new Date(),
          userId: custodialUserId,
        },
      });
    });
  } catch (dbError) {
    // Critical: account exists on-chain but DB not updated
    logger.error(
      `CRITICAL: Hive account @${username} created on-chain but DB update failed. ` +
        `CustodialUser ID: ${custodialUserId}. RC delegated: ${rcDelegated}. ` +
        `Manual DB fix required.`,
      'account-creation',
      dbError instanceof Error ? dbError : undefined
    );
    throw new AccountCreationError(
      'Account was created on the blockchain but failed to save. Please contact support.',
      'DB_SAVE_FAILED'
    );
  }

  return { hiveUsername: username };
}
