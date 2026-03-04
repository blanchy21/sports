/**
 * Server-side Hive blockchain broadcasting.
 *
 * Uses @hiveio/dhive to sign and broadcast operations with a private key.
 * ONLY used server-side (cron jobs, API routes). Never imported client-side.
 */

import { PrivateKey, Operation } from '@hiveio/dhive';
import { waitForTransaction } from './transaction-confirmation';
import { error as logError } from './logger';
import { getDhiveClient } from '@/lib/hive/dhive-client';

export interface BroadcastResult {
  success: boolean;
  transactionId?: string;
  confirmed?: boolean;
  blockNum?: number;
  error?: string;
}

/**
 * Broadcast operations to Hive signed with a posting key.
 */
export async function broadcastWithKey(
  operations: Operation[],
  postingKey: string
): Promise<BroadcastResult> {
  try {
    const client = getDhiveClient();
    const key = PrivateKey.fromString(postingKey);

    const result = await client.broadcast.sendOperations(operations, key);

    // Confirm transaction was included in a block
    const confirmation = await waitForTransaction(result.id);

    return {
      success: true,
      transactionId: result.id,
      confirmed: confirmation.confirmed,
      blockNum: confirmation.blockNum ?? result.block_num,
    };
  } catch (error) {
    logError('Broadcast failed', 'Broadcast', error instanceof Error ? error : undefined);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
