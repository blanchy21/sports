/**
 * Verify a Hive L1 transaction contains a MEDALS transfer matching the
 * expected (sender, amount, escrow, memo) tuple.
 *
 * Mirrors src/lib/predictions/verify-stake.ts. Used for HoL entry fees and
 * buy-back transfers.
 */

import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';
import { logger } from '@/lib/logger';
import { getDhiveClient } from '@/lib/hive/dhive-client';
import { HOL_ESCROW_ACCOUNT } from './escrow';

const dhive = getDhiveClient();
const PLACEHOLDER_TX_ID = 'hivesigner-signed';

interface VerifyParams {
  txId: string;
  expectedUsername: string;
  expectedAmount: number;
  expectedMemo: string;
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

function matchesTransfer(
  opData: Record<string, unknown>,
  expectedUsername: string,
  expectedAmount: number,
  expectedMemo: string
): VerifyResult | null {
  const cj = opData as {
    id?: string;
    required_auths?: string[];
    required_posting_auths?: string[];
    json?: string;
  };
  if (cj.id !== 'ssc-mainnet-hive') return null;
  const auths = [...(cj.required_auths || []), ...(cj.required_posting_auths || [])];
  if (!auths.includes(expectedUsername)) return null;

  let payload: {
    contractName?: string;
    contractAction?: string;
    contractPayload?: { symbol?: string; to?: string; quantity?: string; memo?: string };
  };
  try {
    payload = JSON.parse(cj.json || '{}');
  } catch {
    return null;
  }
  if (payload.contractName !== 'tokens' || payload.contractAction !== 'transfer') return null;
  const cp = payload.contractPayload;
  if (!cp) return null;
  if (cp.to !== HOL_ESCROW_ACCOUNT) return null;
  if (cp.symbol !== MEDALS_CONFIG.SYMBOL) return null;

  const onChainCents = Math.round(parseFloat(cp.quantity || '0') * 1000);
  const expectedCents = Math.round(expectedAmount * 1000);
  if (onChainCents !== expectedCents) {
    return {
      valid: false,
      error: `Amount mismatch: on-chain ${cp.quantity}, expected ${expectedAmount}`,
    };
  }
  if (cp.memo !== expectedMemo) {
    return {
      valid: false,
      error: `Memo mismatch: on-chain "${cp.memo}", expected "${expectedMemo}"`,
    };
  }
  return { valid: true };
}

export async function verifyHolTransfer(params: VerifyParams): Promise<VerifyResult> {
  const { txId, expectedUsername, expectedAmount, expectedMemo } = params;

  if (txId === PLACEHOLDER_TX_ID) {
    return { valid: false, error: 'HiveSigner placeholder tx not supported for HoL' };
  }

  try {
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 4000;
    const BACKOFF_MS = 3000;
    let tx: Awaited<ReturnType<typeof dhive.database.getTransaction>> | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = INITIAL_DELAY_MS + (attempt - 1) * BACKOFF_MS;
        await new Promise((r) => setTimeout(r, delay));
      }
      try {
        tx = await dhive.database.getTransaction(txId);
      } catch (e) {
        if (attempt === MAX_RETRIES) throw e;
        continue;
      }
      if (tx?.operations?.length) break;
    }

    if (!tx?.operations?.length) {
      return { valid: false, error: 'Transaction not found on-chain after retries' };
    }

    for (const op of tx.operations) {
      const opArr = op as unknown as [string, Record<string, unknown>];
      if (opArr[0] !== 'custom_json') continue;
      const result = matchesTransfer(opArr[1], expectedUsername, expectedAmount, expectedMemo);
      if (result) return result;
    }

    return { valid: false, error: 'No matching MEDALS transfer in transaction' };
  } catch (error) {
    logger.error('HoL tx verification failed', 'hol:verify-tx', error);
    return { valid: false, error: error instanceof Error ? error.message : 'Verification failed' };
  }
}
