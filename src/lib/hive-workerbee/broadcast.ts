/**
 * Server-side Hive blockchain broadcasting.
 *
 * Uses @hiveio/dhive to sign and broadcast operations with a private key.
 * ONLY used server-side (cron jobs, API routes). Never imported client-side.
 */

import { Client, PrivateKey, Operation } from '@hiveio/dhive';
import { HIVE_NODES } from './nodes';

let dhiveClient: Client | null = null;

function getDhiveClient(): Client {
  if (!dhiveClient) {
    dhiveClient = new Client(HIVE_NODES);
  }
  return dhiveClient;
}

export interface BroadcastResult {
  success: boolean;
  transactionId?: string;
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

    return {
      success: true,
      transactionId: result.id,
      blockNum: result.block_num,
    };
  } catch (error) {
    console.error('[Broadcast] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
