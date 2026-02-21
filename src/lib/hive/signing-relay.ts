import { Client, PrivateKey, type Operation } from '@hiveio/dhive';
import { prisma } from '@/lib/db/prisma';
import { decryptKeys } from '@/lib/hive/key-encryption';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';
import { logger } from '@/lib/logger';
import type { HiveOperation } from '@/types/hive-operations';

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
        // Reject active-authority custom_json operations
        const activeAuths = opBody.required_auths;
        if (Array.isArray(activeAuths) && activeAuths.length > 0) {
          throw new OperationValidationError(
            'custom_json with required_auths (active authority) is not allowed via signing relay'
          );
        }

        const postingAuths = opBody.required_posting_auths;
        if (!Array.isArray(postingAuths) || !postingAuths.includes(hiveUsername)) {
          throw new OperationValidationError(
            `custom_json required_posting_auths does not include "${hiveUsername}"`
          );
        }

        // Restrict to known safe custom_json IDs
        const ALLOWED_CUSTOM_JSON_IDS = new Set(['follow', 'reblog', 'community', 'notify', 'rc']);
        if (!ALLOWED_CUSTOM_JSON_IDS.has(opBody.id as string)) {
          throw new OperationValidationError(
            `custom_json id "${opBody.id}" is not allowed via the signing relay`
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
        // Only allow posting_json_metadata updates — reject authority key changes
        if (opBody.owner || opBody.active || opBody.posting || opBody.memo_key) {
          throw new OperationValidationError(
            'Authority key changes are not allowed via the signing relay'
          );
        }
        if (opBody.json_metadata && opBody.json_metadata !== '') {
          throw new OperationValidationError(
            'json_metadata changes are not allowed via the signing relay (use posting_json_metadata)'
          );
        }
        // Validate posting_json_metadata contains only expected profile fields
        if (opBody.posting_json_metadata) {
          try {
            const meta = JSON.parse(opBody.posting_json_metadata);
            const ALLOWED_PROFILE_KEYS = new Set([
              'profile',
              'name',
              'about',
              'location',
              'website',
              'cover_image',
              'profile_image',
              'version',
            ]);
            for (const key of Object.keys(meta)) {
              if (!ALLOWED_PROFILE_KEYS.has(key)) {
                throw new OperationValidationError(
                  `posting_json_metadata key "${key}" is not allowed via the signing relay`
                );
              }
            }
          } catch (e) {
            if (e instanceof OperationValidationError) throw e;
            throw new OperationValidationError('posting_json_metadata must be valid JSON');
          }
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
    select: { encryptedKeys: true, encryptionIv: true, encryptionSalt: true },
  });

  if (!custodialUser?.encryptedKeys || !custodialUser.encryptionIv) {
    throw new Error(`No encrypted keys found for custodial user ${custodialUserId}`);
  }

  let postingKeyString: string | null = null;

  try {
    const decrypted = decryptKeys(
      custodialUser.encryptedKeys,
      custodialUser.encryptionIv,
      custodialUser.encryptionSalt ?? undefined
    );
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
    // Clear reference to decrypted key. Note: setting to null does NOT securely
    // wipe the string from heap memory — JavaScript provides no mechanism for that.
    // The original string remains until garbage-collected.
    postingKeyString = null;
  }
}
