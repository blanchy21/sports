import { Client, PrivateKey } from '@hiveio/dhive';
import { prisma } from '@/lib/db/prisma';
import { PredictionStatus } from '@/generated/prisma/client';
import { calculateSettlement } from './odds';
import { buildPayoutOps, buildFeeOps, buildRefundOps } from './escrow';
import type { SettlementResult } from './types';
import { logger } from '@/lib/logger';

const dhive = new Client(['https://api.hive.blog', 'https://api.deathwing.me', 'https://anyx.io']);

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
  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    include: { outcomes: true, stakes: true },
  });

  if (!prediction) {
    throw new Error(`Prediction not found: ${predictionId}`);
  }

  if (
    prediction.status !== PredictionStatus.LOCKED &&
    prediction.status !== PredictionStatus.SETTLING
  ) {
    throw new Error(
      `Prediction must be LOCKED or SETTLING for settlement (current: ${prediction.status})`
    );
  }

  const validOutcome = prediction.outcomes.find((o) => o.id === winningOutcomeId);
  if (!validOutcome) {
    throw new Error(`Invalid winning outcome: ${winningOutcomeId}`);
  }

  const stakes = prediction.stakes.map((s) => ({
    id: s.id,
    username: s.username,
    outcomeId: s.outcomeId,
    amount: s.amount.toNumber(),
  }));

  const totalPool = prediction.totalPool.toNumber();
  const settlement = calculateSettlement(stakes, winningOutcomeId, totalPool);

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
        { username: stake.username, amount: stake.amount.toNumber(), predictionId },
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

  // Mark as settling
  await prisma.prediction.update({
    where: { id: predictionId },
    data: { status: PredictionStatus.SETTLING },
  });

  try {
    // Broadcast fee ops (burn + reward) — skip if already done on a prior attempt
    if (!prediction.feeTxId) {
      const feeOps = buildFeeOps(settlement.platformFee, predictionId);
      if (feeOps.length > 0) {
        const feeTxId = await broadcastHiveEngineOps(feeOps);
        await prisma.prediction.update({
          where: { id: predictionId },
          data: { feeTxId },
        });
        logger.info(`Fee ops broadcast: ${feeTxId}`, 'Settlement', { predictionId });
      }
    } else {
      logger.info(`Fee ops already broadcast (${prediction.feeTxId}), skipping`, 'Settlement', {
        predictionId,
      });
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
      totalPool,
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

  // Allow VOID status for retries (partial refund broadcast may have failed)
  if (
    prediction.status !== PredictionStatus.OPEN &&
    prediction.status !== PredictionStatus.LOCKED &&
    prediction.status !== PredictionStatus.VOID
  ) {
    throw new Error(`Cannot void prediction in ${prediction.status} status`);
  }

  // Mark as VOID immediately (idempotent — may already be VOID on retry)
  if (prediction.status !== PredictionStatus.VOID) {
    await prisma.prediction.update({
      where: { id: predictionId },
      data: { status: PredictionStatus.VOID, isVoid: true, voidReason: reason },
    });
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
        { username: stake.username, amount: stake.amount.toNumber(), predictionId },
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
