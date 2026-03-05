import { buildTransferOpFromAmount, buildBatchTransferOps } from '@/lib/hive-engine/operations';
import { PREDICTION_CONFIG } from './constants';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';
import type { CustomJsonOp } from '@/lib/hive-engine/types';

/** Coerce Decimal | number to number for the transfer operation builder */
function toNum(v: { toNumber(): number } | number): number {
  return typeof v === 'number' ? v : v.toNumber();
}

export function buildStakeEscrowOp(
  username: string,
  amount: number,
  predictionId: string,
  outcomeId: string
): CustomJsonOp {
  return buildTransferOpFromAmount(
    username,
    PREDICTION_CONFIG.ESCROW_ACCOUNT,
    amount,
    MEDALS_CONFIG.SYMBOL,
    `prediction-stake|${predictionId}|${outcomeId}`
  );
}

export function buildPayoutOps(
  payouts: Array<{
    username: string;
    amount: { toNumber(): number } | number;
    predictionId: string;
  }>
): CustomJsonOp[] {
  const transfers = payouts.map((p) => ({
    to: p.username,
    amount: toNum(p.amount),
    memo: `prediction-payout|${p.predictionId}`,
  }));

  return buildBatchTransferOps(PREDICTION_CONFIG.ESCROW_ACCOUNT, transfers);
}

export interface FeeOps {
  burn: CustomJsonOp | null;
  reward: CustomJsonOp | null;
}

/**
 * Build fee transfer operations from pre-calculated Decimal-precision amounts.
 * Avoids recalculating splits with floating-point — callers pass exact values
 * from calculateSettlement() which uses Decimal throughout.
 */
export function buildFeeOps(
  fees: { burnAmount: number; rewardAmount: number },
  predictionId: string
): FeeOps {
  return {
    burn:
      fees.burnAmount > 0
        ? buildTransferOpFromAmount(
            PREDICTION_CONFIG.ESCROW_ACCOUNT,
            PREDICTION_CONFIG.BURN_ACCOUNT,
            fees.burnAmount,
            MEDALS_CONFIG.SYMBOL,
            `prediction-fee-burn|${predictionId}`
          )
        : null,
    reward:
      fees.rewardAmount > 0
        ? buildTransferOpFromAmount(
            PREDICTION_CONFIG.ESCROW_ACCOUNT,
            PREDICTION_CONFIG.REWARDS_ACCOUNT,
            fees.rewardAmount,
            MEDALS_CONFIG.SYMBOL,
            `prediction-fee-reward|${predictionId}`
          )
        : null,
  };
}

export function buildRefundOps(
  refunds: Array<{
    username: string;
    amount: { toNumber(): number } | number;
    predictionId: string;
  }>
): CustomJsonOp[] {
  const transfers = refunds.map((r) => ({
    to: r.username,
    amount: toNum(r.amount),
    memo: `prediction-refund|${r.predictionId}`,
  }));

  return buildBatchTransferOps(PREDICTION_CONFIG.ESCROW_ACCOUNT, transfers);
}
