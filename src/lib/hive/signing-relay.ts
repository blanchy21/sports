import { Client, PrivateKey, type Operation } from '@hiveio/dhive';
import { prisma } from '@/lib/db/prisma';
import { decryptKeys } from '@/lib/hive/key-encryption';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HiveOperation = [string, Record<string, unknown>];

export interface SigningResult {
  transactionId: string;
}

// ---------------------------------------------------------------------------
// Allowed operation types (posting-key only)
// ---------------------------------------------------------------------------

const ALLOWED_OP_TYPES = new Set([
  'vote',
  'comment',
  'comment_options',
  'custom_json',
  'delete_comment',
  'account_update2',
]);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export class OperationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationValidationError';
  }
}

export function validateOperations(operations: HiveOperation[], hiveUsername: string): void {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new OperationValidationError('Operations array must be non-empty');
  }

  for (const [opType, opBody] of operations) {
    if (!ALLOWED_OP_TYPES.has(opType)) {
      throw new OperationValidationError(`Operation type "${opType}" is not allowed`);
    }

    switch (opType) {
      case 'vote':
        if (opBody.voter !== hiveUsername) {
          throw new OperationValidationError(
            `Vote voter "${opBody.voter}" does not match authenticated user "${hiveUsername}"`
          );
        }
        break;

      case 'comment':
        if (opBody.author !== hiveUsername) {
          throw new OperationValidationError(
            `Comment author "${opBody.author}" does not match authenticated user "${hiveUsername}"`
          );
        }
        break;

      case 'comment_options':
        if (opBody.author !== hiveUsername) {
          throw new OperationValidationError(
            `Comment options author "${opBody.author}" does not match authenticated user "${hiveUsername}"`
          );
        }
        break;

      case 'custom_json': {
        const postingAuths = opBody.required_posting_auths;
        if (!Array.isArray(postingAuths) || !postingAuths.includes(hiveUsername)) {
          throw new OperationValidationError(
            `custom_json required_posting_auths does not include "${hiveUsername}"`
          );
        }
        break;
      }

      case 'delete_comment':
        if (opBody.author !== hiveUsername) {
          throw new OperationValidationError(
            `Delete comment author "${opBody.author}" does not match authenticated user "${hiveUsername}"`
          );
        }
        break;

      case 'account_update2':
        if (opBody.account !== hiveUsername) {
          throw new OperationValidationError(
            `Account update account "${opBody.account}" does not match authenticated user "${hiveUsername}"`
          );
        }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Sign & Broadcast
// ---------------------------------------------------------------------------

export async function signAndBroadcast(
  hiveUsername: string,
  custodialUserId: string,
  operations: HiveOperation[]
): Promise<SigningResult> {
  const custodialUser = await prisma.custodialUser.findUnique({
    where: { id: custodialUserId },
    select: { encryptedKeys: true, encryptionIv: true },
  });

  if (!custodialUser?.encryptedKeys || !custodialUser.encryptionIv) {
    throw new Error(`No encrypted keys found for custodial user ${custodialUserId}`);
  }

  let postingKeyString: string | null = null;

  try {
    const decrypted = decryptKeys(custodialUser.encryptedKeys, custodialUser.encryptionIv);
    const keys = JSON.parse(decrypted) as Record<string, string>;

    postingKeyString = keys.posting ?? null;
    if (!postingKeyString) {
      throw new Error('Posting key not found in decrypted keys');
    }

    const signingKey = PrivateKey.fromString(postingKeyString);
    const client = new Client(HIVE_NODES);

    const result = await client.broadcast.sendOperations(
      operations as unknown as Operation[],
      signingKey
    );

    logger.info('Broadcast successful', 'signing-relay', {
      hiveUsername,
      transactionId: result.id,
      opCount: operations.length,
    });

    return { transactionId: result.id };
  } finally {
    // Ensure decrypted key is discarded from memory
    postingKeyString = null;
  }
}
