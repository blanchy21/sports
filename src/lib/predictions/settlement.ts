import { Client, PrivateKey } from '@hiveio/dhive';
import { prisma } from '@/lib/db/prisma';
import { PredictionStatus } from '@/generated/prisma/client';
import { calculateSettlement } from './odds';
import { buildPayoutOps, buildFeeOps, type FeeOps, buildRefundOps } from './escrow';
import type { SettlementResult } from './types';
import { logger } from '@/lib/logger';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';

const dhive = new Client(HIVE_NODES);

function getEscrowActiveKey(): PrivateKey {
  const activeKey = process.env.SP_PREDICTIONS_ACTIVE_KEY;
  if (!activeKey) {
    throw new Error('SP_PREDICTIONS_ACTIVE_KEY is not configured');
  }
  return PrivateKey.fromString(activeKey);
}

export async function broadcastHiveEngineOps(
  operations: Array<{
    id: string;
    required_auths: string[];
    required_posting_auths: string[];
    json: string;
  }>
): Promise<string> {
  const key = getEscrowActiveKey();
  let txId = '';

  for (const op of operations) {
    const result = await dhive.broadcast.sendOperations([['custom_json', op] as never], key);
    txId = result.id;
  }

  return txId;
}

export async function executeSettlement(
  predictionId: string,
  winningOutcomeId: string,
  settledBy: string
): Promise<SettlementResult> {
  // Atomic lock: transition LOCKED → SETTLING in a single conditional update.
  // If count === 0, either already SETTLING (retry) or invalid state.
  const lockResult = await prisma.prediction.updateMany({
    where: { id: predictionId, status: PredictionStatus.LOCKED },
    data: { status: PredictionStatus.SETTLING },
  });

  if (lockResult.count === 0) {
    // Check if it's a valid retry (already SETTLING) or an invalid state
    const current = await prisma.prediction.findUnique({
      where: { id: predictionId },
      select: { status: true },
    });
    if (!current) {
      throw new Error(`Prediction not found: ${predictionId}`);
    }
    if (current.status !== PredictionStatus.SETTLING) {
      throw new Error(`Prediction must be LOCKED for settlement (current: ${current.status})`);
    }
    // SETTLING = retry path, continue
  }

  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    include: { outcomes: true, stakes: true },
  });

  if (!prediction) {
    throw new Error(`Prediction not found: ${predictionId}`);
  }

  const validOutcome = prediction.outcomes.find((o) => o.id === winningOutcomeId);
  if (!validOutcome) {
    throw new Error(`Invalid winning outcome: ${winningOutcomeId}`);
  }

  // Pass Decimal values directly — calculateSettlement uses Decimal arithmetic internally
  const stakes = prediction.stakes.map((s) => ({
    id: s.id,
    username: s.username,
    outcomeId: s.outcomeId,
    amount: s.amount,
  }));

  const settlement = calculateSettlement(stakes, winningOutcomeId, prediction.totalPool);

  // Refund everyone if no real contest occurred:
  // 1. All stakes on the same outcome (no opposing bets)
  // 2. Winning outcome has 0 backers (nobody predicted correctly)
  const uniqueOutcomes = new Set(stakes.map((s) => s.outcomeId));
  const winningOutcomeHasBackers = stakes.some((s) => s.outcomeId === winningOutcomeId);
  if (uniqueOutcomes.size === 1 || !winningOutcomeHasBackers) {
    // Broadcast refunds per-stake for idempotency
    for (const stake of prediction.stakes) {
      if (stake.refunded) {
        logger.info(`Refund already sent for stake ${stake.id}, skipping`, 'Settlement', {
          predictionId,
        });
        continue;
      }
      const [op] = buildRefundOps([
        { username: stake.username, amount: stake.amount, predictionId },
      ]);
      const txId = await broadcastHiveEngineOps([op]);
      await prisma.predictionStake.update({
        where: { id: stake.id },
        data: { refunded: true },
      });
      logger.info(`Refund sent to ${stake.username}: ${txId}`, 'Settlement', { predictionId });
    }

    await prisma.$transaction(async (tx) => {
      await tx.predictionOutcome.update({
        where: { id: winningOutcomeId },
        data: { isWinner: true },
      });
      await tx.prediction.update({
        where: { id: predictionId },
        data: {
          status: PredictionStatus.REFUNDED,
          winningOutcomeId,
          platformCut: 0,
          burnedAmount: 0,
          rewardPoolAmount: 0,
          settledAt: new Date(),
          settledBy,
        },
      });
    });

    const reason =
      uniqueOutcomes.size === 1 ? 'no opposing stakes' : 'no backers on winning outcome';
    logger.info(`Prediction refunded (${reason}): ${predictionId}`, 'Settlement');
    return { ...settlement, platformFee: 0, burnAmount: 0, rewardAmount: 0, totalPaid: 0 };
  }

  try {
    // Broadcast fee ops (burn + reward) separately for independent idempotency
    const feeOps: FeeOps = buildFeeOps(settlement.platformFee, predictionId);

    if (feeOps.burn && !prediction.feeBurnTxId) {
      const txId = await broadcastHiveEngineOps([feeOps.burn]);
      await prisma.prediction.update({
        where: { id: predictionId },
        data: { feeBurnTxId: txId },
      });
      logger.info(`Fee burn broadcast: ${txId}`, 'Settlement', { predictionId });
    }

    if (feeOps.reward && !prediction.feeRewardTxId) {
      const txId = await broadcastHiveEngineOps([feeOps.reward]);
      await prisma.prediction.update({
        where: { id: predictionId },
        data: { feeRewardTxId: txId },
      });
      logger.info(`Fee reward broadcast: ${txId}`, 'Settlement', { predictionId });
    }

    // Broadcast payout ops to winners — per-stake for idempotency
    for (const payout of settlement.payouts) {
      const existingStake = prediction.stakes.find((s) => s.id === payout.stakeId);
      if (existingStake?.payoutTxId) {
        logger.info(`Payout already sent for stake ${payout.stakeId}, skipping`, 'Settlement', {
          predictionId,
        });
        continue;
      }
      const [op] = buildPayoutOps([
        { username: payout.username, amount: payout.payoutAmount, predictionId },
      ]);
      const txId = await broadcastHiveEngineOps([op]);
      await prisma.predictionStake.update({
        where: { id: payout.stakeId },
        data: { payoutTxId: txId },
      });
      logger.info(`Payout sent to ${payout.username}: ${txId}`, 'Settlement', { predictionId });
    }

    // Update DB atomically
    await prisma.$transaction(async (tx) => {
      // Update winning stakes with payout amounts
      for (const payout of settlement.payouts) {
        await tx.predictionStake.update({
          where: { id: payout.stakeId },
          data: { payout: payout.payoutAmount },
        });
      }

      // Mark winning outcome
      await tx.predictionOutcome.update({
        where: { id: winningOutcomeId },
        data: { isWinner: true },
      });

      // Update prediction to SETTLED
      await tx.prediction.update({
        where: { id: predictionId },
        data: {
          status: PredictionStatus.SETTLED,
          winningOutcomeId,
          platformCut: settlement.platformFee,
          burnedAmount: settlement.burnAmount,
          rewardPoolAmount: settlement.rewardAmount,
          settledAt: new Date(),
          settledBy,
        },
      });
    });

    logger.info(`Prediction settled: ${predictionId}`, 'Settlement', {
      winningOutcomeId,
      totalPool: settlement.totalPool,
      payoutCount: settlement.payouts.length,
    });

    return settlement;
  } catch (error) {
    logger.error(`Settlement failed for ${predictionId}`, 'Settlement', error);

    // Stay in SETTLING so retry skips already-completed steps (e.g. fee broadcast)
    logger.warn(`Settlement incomplete, status remains SETTLING for retry`, 'Settlement', {
      predictionId,
    });

    throw error;
  }
}

export async function executeVoidRefund(
  predictionId: string,
  reason: string,
  voidedBy: string
): Promise<void> {
  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    include: { stakes: true },
  });

  if (!prediction) {
    throw new Error(`Prediction not found: ${predictionId}`);
  }

  // Atomic lock: transition OPEN or LOCKED → VOID in a single conditional update.
  // If count === 0, either already VOID (retry) or invalid state.
  const lockResult = await prisma.prediction.updateMany({
    where: {
      id: predictionId,
      status: { in: [PredictionStatus.OPEN, PredictionStatus.LOCKED] },
    },
    data: { status: PredictionStatus.VOID, isVoid: true, voidReason: reason },
  });

  if (lockResult.count === 0) {
    if (prediction.status !== PredictionStatus.VOID) {
      throw new Error(`Cannot void prediction in ${prediction.status} status`);
    }
    // VOID = retry path, continue with refund broadcasts
  }

  try {
    // Broadcast refunds per-stake for idempotency
    for (const stake of prediction.stakes) {
      if (stake.refunded) {
        logger.info(`Refund already sent for stake ${stake.id}, skipping`, 'Settlement', {
          predictionId,
        });
        continue;
      }
      const [op] = buildRefundOps([
        { username: stake.username, amount: stake.amount, predictionId },
      ]);
      const txId = await broadcastHiveEngineOps([op]);
      await prisma.predictionStake.update({
        where: { id: stake.id },
        data: { refunded: true },
      });
      logger.info(`Refund sent to ${stake.username}: ${txId}`, 'Settlement', { predictionId });
    }

    // Set final status
    await prisma.$transaction(async (tx) => {
      await tx.prediction.update({
        where: { id: predictionId },
        data: {
          status: PredictionStatus.REFUNDED,
          settledBy: voidedBy,
          settledAt: new Date(),
        },
      });
    });

    logger.info(`Prediction voided and refunded: ${predictionId}`, 'Settlement', {
      reason,
      stakeCount: prediction.stakes.length,
    });
  } catch (error) {
    logger.error(`Void refund failed for ${predictionId}`, 'Settlement', error);
    throw error;
  }
}
