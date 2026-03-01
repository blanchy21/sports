/**
 * Stake Transaction Verification
 *
 * Verifies that a Hive L1 transaction ID corresponds to a valid
 * Hive Engine token transfer for a prediction stake.
 */

import { Client } from '@hiveio/dhive';
import { PREDICTION_CONFIG } from './constants';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';
import { logger } from '@/lib/logger';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';

const dhive = new Client(HIVE_NODES);

interface VerifyStakeParams {
  txId: string;
  expectedUsername: string;
  expectedAmount: number;
  expectedPredictionId: string;
  expectedOutcomeId: string;
}

interface VerifyResult {
  valid: boolean;
  error?: string;
}

/**
 * Verify a stake transaction exists on-chain with the expected parameters.
 *
 * Checks the Hive L1 transaction for a custom_json operation that matches:
 * - ID: ssc-mainnet-hive
 * - Sender: expectedUsername
 * - Payload: tokens/transfer to sp-predictions with correct amount and memo
 */
export async function verifyStakeTransaction(params: VerifyStakeParams): Promise<VerifyResult> {
  const { txId, expectedUsername, expectedAmount, expectedPredictionId, expectedOutcomeId } =
    params;

  try {
    // Fetch the transaction from Hive L1.
    // Hive blocks are produced every ~3s, so a just-broadcast tx may still be
    // in the mempool. Retry with a linear backoff to wait for confirmation.
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 4000; // just over 1 block
    const BACKOFF_MS = 3000; // linear increase per retry

    let tx: Awaited<ReturnType<typeof dhive.database.getTransaction>> | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = INITIAL_DELAY_MS + (attempt - 1) * BACKOFF_MS;
        logger.info(
          `Stake tx ${txId} not found, retry ${attempt}/${MAX_RETRIES} after ${delay}ms`,
          'verify-stake'
        );
        await new Promise((r) => setTimeout(r, delay));
      }

      try {
        tx = await dhive.database.getTransaction(txId);
      } catch (fetchErr) {
        // Node errors (timeouts, 404s) are retryable
        if (attempt === MAX_RETRIES) throw fetchErr;
        continue;
      }

      if (tx && tx.operations && tx.operations.length > 0) break;
    }

    if (!tx || !tx.operations || tx.operations.length === 0) {
      return { valid: false, error: 'Transaction not found on-chain after retries' };
    }

    // Look for a matching custom_json operation in the transaction
    for (const op of tx.operations) {
      // dhive Operations are [type, data] tuples
      const opArr = op as unknown as [string, Record<string, unknown>];
      const opType = opArr[0];
      const opData = opArr[1];
      if (opType !== 'custom_json') continue;

      const customJson = opData as {
        id?: string;
        required_auths?: string[];
        required_posting_auths?: string[];
        json?: string;
      };

      // Must be a Hive Engine operation
      if (customJson.id !== 'ssc-mainnet-hive') continue;

      // Sender must be in required_auths or required_posting_auths
      const allAuths = [
        ...(customJson.required_auths || []),
        ...(customJson.required_posting_auths || []),
      ];
      if (!allAuths.includes(expectedUsername)) {
        continue;
      }

      // Parse the JSON payload
      let payload: {
        contractName?: string;
        contractAction?: string;
        contractPayload?: {
          symbol?: string;
          to?: string;
          quantity?: string;
          memo?: string;
        };
      };
      try {
        payload = JSON.parse(customJson.json || '{}');
      } catch {
        continue;
      }

      // Must be a tokens/transfer operation
      if (payload.contractName !== 'tokens' || payload.contractAction !== 'transfer') {
        continue;
      }

      const cp = payload.contractPayload;
      if (!cp) continue;

      // Verify recipient is the escrow account
      if (cp.to !== PREDICTION_CONFIG.ESCROW_ACCOUNT) {
        continue;
      }

      // Verify token symbol
      if (cp.symbol !== MEDALS_CONFIG.SYMBOL) {
        continue;
      }

      // Verify amount (compare as numbers with 3dp precision)
      const onChainAmount = parseFloat(cp.quantity || '0');
      if (Math.abs(onChainAmount - expectedAmount) > 0.001) {
        return {
          valid: false,
          error: `Amount mismatch: on-chain ${onChainAmount}, expected ${expectedAmount}`,
        };
      }

      // Verify memo matches the expected pattern
      const expectedMemo = `prediction-stake|${expectedPredictionId}|${expectedOutcomeId}`;
      if (cp.memo !== expectedMemo) {
        return {
          valid: false,
          error: `Memo mismatch: on-chain "${cp.memo}", expected "${expectedMemo}"`,
        };
      }

      // All checks passed
      return { valid: true };
    }

    return { valid: false, error: 'No matching stake transfer found in transaction' };
  } catch (error) {
    logger.error('Stake verification failed', 'verify-stake', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}
