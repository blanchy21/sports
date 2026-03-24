/**
 * Stake Transaction Verification
 *
 * Verifies that a Hive L1 transaction ID corresponds to a valid
 * Hive Engine token transfer for a prediction stake.
 *
 * When HiveSigner doesn't return a txId (active-key sign popup),
 * falls back to scanning recent account history for a matching transfer.
 */

import { PREDICTION_CONFIG } from './constants';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';
import { logger } from '@/lib/logger';
import { getDhiveClient } from '@/lib/hive/dhive-client';

const dhive = getDhiveClient();

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

/** Placeholder txId sent when HiveSigner's sign popup didn't return a real hash. */
const PLACEHOLDER_TX_ID = 'hivesigner-signed';

/**
 * Check whether a single custom_json operation matches the expected stake transfer.
 */
function matchesStakeTransfer(
  opData: Record<string, unknown>,
  expectedUsername: string,
  expectedAmount: number,
  expectedPredictionId: string,
  expectedOutcomeId: string
): VerifyResult | null {
  const customJson = opData as {
    id?: string;
    required_auths?: string[];
    required_posting_auths?: string[];
    json?: string;
  };

  // Must be a Hive Engine operation
  if (customJson.id !== 'ssc-mainnet-hive') return null;

  // Sender must be in required_auths or required_posting_auths
  const allAuths = [
    ...(customJson.required_auths || []),
    ...(customJson.required_posting_auths || []),
  ];
  if (!allAuths.includes(expectedUsername)) return null;

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
    return null;
  }

  // Must be a tokens/transfer operation
  if (payload.contractName !== 'tokens' || payload.contractAction !== 'transfer') return null;

  const cp = payload.contractPayload;
  if (!cp) return null;

  // Verify recipient is the escrow account
  if (cp.to !== PREDICTION_CONFIG.ESCROW_ACCOUNT) return null;

  // Verify token symbol
  if (cp.symbol !== MEDALS_CONFIG.SYMBOL) return null;

  // Verify amount using integer comparison (3dp precision, no float tolerance)
  const onChainCents = Math.round(parseFloat(cp.quantity || '0') * 1000);
  const expectedCents = Math.round(expectedAmount * 1000);
  if (onChainCents !== expectedCents) {
    return {
      valid: false,
      error: `Amount mismatch: on-chain ${cp.quantity}, expected ${expectedAmount}`,
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

  // When HiveSigner's sign popup didn't return a real txId, fall back to
  // scanning the user's recent account history for a matching transfer.
  if (txId === PLACEHOLDER_TX_ID) {
    return verifyViaAccountHistory(params);
  }

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
      if (opArr[0] !== 'custom_json') continue;

      const result = matchesStakeTransfer(
        opArr[1],
        expectedUsername,
        expectedAmount,
        expectedPredictionId,
        expectedOutcomeId
      );
      if (result) return result;
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

/**
 * Fallback verification: scan the user's recent account history for a matching
 * stake transfer.  Used when HiveSigner didn't return a transaction ID.
 *
 * Searches the last 50 custom_json operations (within the last ~2 minutes)
 * for the expected MEDALS transfer to the escrow account.
 */
async function verifyViaAccountHistory(params: VerifyStakeParams): Promise<VerifyResult> {
  const { expectedUsername, expectedAmount, expectedPredictionId, expectedOutcomeId } = params;

  const MAX_RETRIES = 4;
  const INITIAL_DELAY_MS = 5000; // wait for tx to appear in history
  const BACKOFF_MS = 4000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Always wait before the first attempt — the tx needs time to confirm
    const delay = attempt === 0 ? INITIAL_DELAY_MS : BACKOFF_MS;
    logger.info(
      `Verifying HiveSigner stake via account history, attempt ${attempt + 1}/${MAX_RETRIES + 1} after ${delay}ms`,
      'verify-stake'
    );
    await new Promise((r) => setTimeout(r, delay));

    try {
      // Fetch recent account history — custom_json is operation type 18
      const history: [number, { op: [string, Record<string, unknown>]; timestamp: string }][] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (dhive.database as any).call('condenser_api', 'get_account_history', [
          expectedUsername,
          -1, // from most recent
          50, // last 50 operations
          1 << 18, // filter: custom_json only
        ]);

      if (!Array.isArray(history)) continue;

      // Only consider operations from the last 2 minutes
      const cutoff = Date.now() - 120_000;

      for (const [, entry] of history) {
        const opTime = new Date(entry.timestamp + 'Z').getTime();
        if (opTime < cutoff) continue;

        const [opType, opData] = entry.op;
        if (opType !== 'custom_json') continue;

        const result = matchesStakeTransfer(
          opData,
          expectedUsername,
          expectedAmount,
          expectedPredictionId,
          expectedOutcomeId
        );
        if (result?.valid) {
          logger.info('HiveSigner stake verified via account history scan', 'verify-stake', {
            username: expectedUsername,
            predictionId: expectedPredictionId,
          });
          return result;
        }
        // If result is non-null but invalid (amount/memo mismatch), return it
        if (result) return result;
      }
    } catch (err) {
      logger.warn(`Account history scan attempt ${attempt + 1} failed`, 'verify-stake', err);
      if (attempt === MAX_RETRIES) {
        return {
          valid: false,
          error:
            'Failed to verify stake via account history: ' +
            (err instanceof Error ? err.message : 'Unknown error'),
        };
      }
    }
  }

  return {
    valid: false,
    error:
      'Stake transfer not found in recent account history. It may still be confirming — please try again in a moment.',
  };
}
