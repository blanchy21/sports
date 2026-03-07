/**
 * Contest Escrow Operations
 *
 * Builds Hive Engine custom_json operations for contest entry fees,
 * prize payouts, and refunds. Mirrors predictions/escrow.ts.
 */

import { buildTransferOpFromAmount, buildBatchTransferOps } from '@/lib/hive-engine/operations';
import { CONTEST_CONFIG } from './constants';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';
import type { CustomJsonOp } from '@/lib/hive-engine/types';

/** Coerce Decimal | number to number */
function toNum(v: { toNumber(): number } | number): number {
  return typeof v === 'number' ? v : v.toNumber();
}

/**
 * Build a MEDALS transfer operation for contest entry fee (user → escrow).
 */
export function buildEntryFeeOp(username: string, amount: number, contestId: string): CustomJsonOp {
  return buildTransferOpFromAmount(
    username,
    CONTEST_CONFIG.ESCROW_ACCOUNT,
    amount,
    MEDALS_CONFIG.SYMBOL,
    `${CONTEST_CONFIG.MEMO_PREFIX}|${contestId}`
  );
}

/**
 * Build prize payout operations (escrow → winners).
 */
export function buildPrizePayoutOps(
  payouts: Array<{
    username: string;
    amount: { toNumber(): number } | number;
    contestId: string;
    placement: number;
  }>
): CustomJsonOp[] {
  const transfers = payouts.map((p) => ({
    to: p.username,
    amount: toNum(p.amount),
    memo: `contest-prize|${p.contestId}|place-${p.placement}`,
  }));

  return buildBatchTransferOps(CONTEST_CONFIG.ESCROW_ACCOUNT, transfers);
}

/**
 * Build platform fee burn (escrow → null).
 * Platform fees are burned, not kept.
 */
export function buildPlatformFeeOp(
  amount: { toNumber(): number } | number,
  contestId: string
): CustomJsonOp {
  return buildTransferOpFromAmount(
    CONTEST_CONFIG.ESCROW_ACCOUNT,
    CONTEST_CONFIG.BURN_ACCOUNT,
    toNum(amount),
    MEDALS_CONFIG.SYMBOL,
    `contest-platform-fee-burn|${contestId}`
  );
}

/**
 * Build creator fee transfer (escrow → creator).
 */
export function buildCreatorFeeOp(
  creatorUsername: string,
  amount: { toNumber(): number } | number,
  contestId: string
): CustomJsonOp {
  return buildTransferOpFromAmount(
    CONTEST_CONFIG.ESCROW_ACCOUNT,
    creatorUsername,
    toNum(amount),
    MEDALS_CONFIG.SYMBOL,
    `contest-creator-fee|${contestId}`
  );
}

/**
 * Build refund operations (escrow → entrants).
 */
export function buildRefundOps(
  refunds: Array<{
    username: string;
    amount: { toNumber(): number } | number;
    contestId: string;
  }>
): CustomJsonOp[] {
  const transfers = refunds.map((r) => ({
    to: r.username,
    amount: toNum(r.amount),
    memo: `contest-refund|${r.contestId}`,
  }));

  return buildBatchTransferOps(CONTEST_CONFIG.ESCROW_ACCOUNT, transfers);
}

/**
 * Build entry fee burn operation (escrow → null).
 * Used by FIXED model to burn all collected entry fees.
 */
export function buildEntryFeeBurnOp(amount: number, contestId: string): CustomJsonOp {
  return buildTransferOpFromAmount(
    CONTEST_CONFIG.ESCROW_ACCOUNT,
    CONTEST_CONFIG.BURN_ACCOUNT,
    amount,
    MEDALS_CONFIG.SYMBOL,
    `contest-entry-fee-burn|${contestId}`
  );
}

/**
 * Build fixed prize payout operations (sportsblock → winners).
 * Used by FIXED model where prizes come from the sponsor account.
 */
export function buildFixedPrizePayoutOps(
  payouts: Array<{
    username: string;
    amount: { toNumber(): number } | number;
    contestId: string;
    placement: number;
  }>
): CustomJsonOp[] {
  const transfers = payouts.map((p) => ({
    to: p.username,
    amount: toNum(p.amount),
    memo: `contest-prize|${p.contestId}|place-${p.placement}`,
  }));

  return buildBatchTransferOps(CONTEST_CONFIG.PLATFORM_ACCOUNT, transfers);
}
