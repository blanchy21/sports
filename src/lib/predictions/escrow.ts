import { buildTransferOpFromAmount, buildBatchTransferOps } from '@/lib/hive-engine/operations';
import { PREDICTION_CONFIG } from './constants';
import { MEDALS_CONFIG } from '@/lib/hive-engine/constants';
import type { CustomJsonOp } from '@/lib/hive-engine/types';

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
  payouts: Array<{ username: string; amount: number; predictionId: string }>
): CustomJsonOp[] {
  const transfers = payouts.map((p) => ({
    to: p.username,
    amount: p.amount,
    memo: `prediction-payout|${p.predictionId}`,
  }));

  return buildBatchTransferOps(PREDICTION_CONFIG.ESCROW_ACCOUNT, transfers);
}

export function buildFeeOps(totalFee: number, predictionId: string): CustomJsonOp[] {
  const burnAmount = totalFee * PREDICTION_CONFIG.BURN_SPLIT;
  const rewardAmount = totalFee * PREDICTION_CONFIG.REWARD_SPLIT;

  const ops: CustomJsonOp[] = [];

  if (burnAmount > 0) {
    ops.push(
      buildTransferOpFromAmount(
        PREDICTION_CONFIG.ESCROW_ACCOUNT,
        PREDICTION_CONFIG.BURN_ACCOUNT,
        burnAmount,
        MEDALS_CONFIG.SYMBOL,
        `prediction-fee-burn|${predictionId}`
      )
    );
  }

  if (rewardAmount > 0) {
    ops.push(
      buildTransferOpFromAmount(
        PREDICTION_CONFIG.ESCROW_ACCOUNT,
        PREDICTION_CONFIG.REWARDS_ACCOUNT,
        rewardAmount,
        MEDALS_CONFIG.SYMBOL,
        `prediction-fee-reward|${predictionId}`
      )
    );
  }

  return ops;
}

export function buildRefundOps(
  refunds: Array<{ username: string; amount: number; predictionId: string }>
): CustomJsonOp[] {
  const transfers = refunds.map((r) => ({
    to: r.username,
    amount: r.amount,
    memo: `prediction-refund|${r.predictionId}`,
  }));

  return buildBatchTransferOps(PREDICTION_CONFIG.ESCROW_ACCOUNT, transfers);
}
