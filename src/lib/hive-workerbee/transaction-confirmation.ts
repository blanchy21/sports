/**
 * Transaction confirmation polling for Hive blockchain.
 *
 * After broadcasting a transaction, the node may accept it but the transaction
 * isn't guaranteed to be included in a block. This utility polls until the
 * transaction appears on-chain or a timeout is reached.
 */

import { makeHiveApiCall } from './api';
import { workerBee as workerBeeLog, warn as logWarn } from './logger';

export interface TransactionConfirmation {
  confirmed: boolean;
  blockNum?: number;
  error?: string;
}

/**
 * Poll the Hive API to confirm a transaction was included in a block.
 * Returns `{ confirmed: true, blockNum }` on success, or `{ confirmed: false }` on timeout.
 * Never throws — timeouts and errors are returned as data.
 */
export async function waitForTransaction(
  transactionId: string,
  options?: {
    timeoutMs?: number;
    pollIntervalMs?: number;
  }
): Promise<TransactionConfirmation> {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const pollIntervalMs = options?.pollIntervalMs ?? 3_000;

  if (!transactionId || transactionId === 'unknown') {
    return { confirmed: false, error: 'No transaction ID provided' };
  }

  const startTime = Date.now();

  workerBeeLog(`[TxConfirm] Waiting for transaction ${transactionId}`, undefined, {
    timeoutMs,
    pollIntervalMs,
  });

  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await makeHiveApiCall<Record<string, unknown>>(
        'condenser_api',
        'get_transaction',
        [transactionId]
      );

      if (result && typeof result === 'object' && 'block_num' in result) {
        const blockNum = result.block_num as number;
        workerBeeLog(`[TxConfirm] Transaction ${transactionId} confirmed in block ${blockNum}`);
        return { confirmed: true, blockNum };
      }
    } catch {
      // Transaction not yet in a block — expected during polling
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  logWarn(
    `[TxConfirm] Transaction ${transactionId} not confirmed after ${timeoutMs}ms`,
    'waitForTransaction'
  );

  return { confirmed: false, error: `Transaction not confirmed within ${timeoutMs}ms` };
}
