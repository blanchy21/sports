import { PrivateKey } from '@hiveio/dhive';
import { prisma } from '@/lib/db/prisma';
import { PredictionStatus } from '@/generated/prisma/client';
import { calculateSettlement } from './odds';
import { buildPayoutOps, buildFeeOps, buildRefundOps } from './escrow';
import type { SettlementResult } from './types';
import { logger } from '@/lib/logger';
import { getDhiveClient } from '@/lib/hive/dhive-client';
import { evaluateBadgesForAction } from '@/lib/badges/evaluator';

const dhive = getDhiveClient();

function getEscrowActiveKey(): PrivateKey {
  const activeKey = process.env.SP_PREDICTIONS_ACTIVE_KEY;
  if (!activeKey) {
    throw new Error('SP_PREDICTIONS_ACTIVE_KEY is not configured');
  }
  return PrivateKey.fromString(activeKey);
}

/**
 * Broadcast a single Hive Engine custom_json op and return its tx id.
 *
 * The previous signature accepted an array and returned only the last tx id,
 * silently losing earlier ones on multi-op calls. All current call sites
 * pass exactly one op; this signature enforces that structurally.
 */
export async function broadcastHiveEngineOps(
  operations: Array<{
    id: string;
    required_auths: string[];
    required_posting_auths: string[];
    json: string;
  }>
): Promise<string> {
  if (operations.length !== 1) {
    throw new Error(
      `broadcastHiveEngineOps expects exactly one operation, got ${operations.length}`
    );
  }
  const key = getEscrowActiveKey();
  const result = await dhive.broadcast.sendOperations(
    [['custom_json', operations[0]] as never],
    key
  );
  return result.id;
}

const PROPOSAL_CLEAR_DATA = {
  proposedOutcomeId: null,
  proposedBy: null,
  proposedAt: null,
  proposedAction: null,
  proposedVoidReason: null,
} as const;

/**
 * Upsert a row into PredictionEscrowLedger for audit + future idempotency.
 *
 * Keyed on @@unique([predictionId, txId]) — retries skip cleanly. Currently
 * additive to the existing payoutTxId/refundTxId/feeBurnTxId columns; over
 * time the ledger should become the source of truth and those columns can
 * be derived from it.
 */
async function recordLedgerEntry(entry: {
  predictionId: string;
  entryType: 'stake_in' | 'payout' | 'refund' | 'fee_burn';
  username: string | null;
  amount: number;
  txId: string;
}): Promise<void> {
  try {
    await prisma.predictionEscrowLedger.upsert({
      where: {
        predictionId_txId: {
          predictionId: entry.predictionId,
          txId: entry.txId,
        },
      },
      create: {
        predictionId: entry.predictionId,
        entryType: entry.entryType,
        username: entry.username,
        amount: entry.amount,
        txId: entry.txId,
      },
      update: {},
    });
  } catch (err) {
    // Ledger writes should never block broadcasts that already succeeded —
    // the column-based guards remain the primary idempotency mechanism.
    logger.error(
      `Failed to record escrow ledger entry for ${entry.predictionId}/${entry.txId}`,
      'Settlement',
      err
    );
  }
}

/**
 * Propose a settlement — transitions LOCKED → PENDING_APPROVAL.
 * Stores proposal fields for a second admin to approve.
 */
export async function proposeSettlement(
  predictionId: string,
  winningOutcomeId: string,
  proposedBy: string
): Promise<void> {
  const result = await prisma.prediction.updateMany({
    where: { id: predictionId, status: PredictionStatus.LOCKED },
    data: {
      status: PredictionStatus.PENDING_APPROVAL,
      proposedOutcomeId: winningOutcomeId,
      proposedBy,
      proposedAt: new Date(),
      proposedAction: 'settle',
      proposedVoidReason: null,
    },
  });
  if (result.count === 0) {
    throw new Error('Prediction must be LOCKED to propose settlement');
  }
}

/**
 * Propose a void — transitions OPEN/LOCKED → PENDING_APPROVAL.
 * Stores proposal fields for a second admin to approve.
 */
export async function proposeVoid(
  predictionId: string,
  reason: string,
  proposedBy: string
): Promise<void> {
  const result = await prisma.prediction.updateMany({
    where: {
      id: predictionId,
      status: {
        in: [PredictionStatus.OPEN, PredictionStatus.LOCKED, PredictionStatus.PENDING_APPROVAL],
      },
    },
    data: {
      status: PredictionStatus.PENDING_APPROVAL,
      proposedOutcomeId: null,
      proposedBy,
      proposedAt: new Date(),
      proposedAction: 'void',
      proposedVoidReason: reason,
    },
  });
  if (result.count === 0) {
    throw new Error('Prediction must be OPEN, LOCKED, or PENDING_APPROVAL to propose void');
  }
}

/**
 * Reject a proposal — transitions PENDING_APPROVAL → LOCKED.
 * Clears all proposal fields. Always restores to LOCKED (safe default).
 */
export async function rejectProposal(predictionId: string): Promise<void> {
  const result = await prisma.prediction.updateMany({
    where: { id: predictionId, status: PredictionStatus.PENDING_APPROVAL },
    data: {
      status: PredictionStatus.LOCKED,
      ...PROPOSAL_CLEAR_DATA,
    },
  });
  if (result.count === 0) {
    throw new Error('Prediction must be PENDING_APPROVAL to reject');
  }
}

export async function executeSettlement(
  predictionId: string,
  winningOutcomeId: string,
  settledBy: string
): Promise<SettlementResult> {
  // Atomic lock: transition LOCKED or PENDING_APPROVAL → SETTLING.
  // If count === 0, either already SETTLING (retry) or invalid state.
  const lockResult = await prisma.prediction.updateMany({
    where: {
      id: predictionId,
      status: { in: [PredictionStatus.LOCKED, PredictionStatus.PENDING_APPROVAL] },
    },
    data: { status: PredictionStatus.SETTLING, winningOutcomeId, ...PROPOSAL_CLEAR_DATA },
  });

  if (lockResult.count === 0) {
    // Check if it's a valid retry (already SETTLING) or an invalid state
    const current = await prisma.prediction.findUnique({
      where: { id: predictionId },
      select: { status: true, winningOutcomeId: true },
    });
    if (!current) {
      throw new Error(`Prediction not found: ${predictionId}`);
    }
    if (current.status !== PredictionStatus.SETTLING) {
      throw new Error(
        `Prediction must be LOCKED or PENDING_APPROVAL for settlement (current: ${current.status})`
      );
    }
    if (current.winningOutcomeId && current.winningOutcomeId !== winningOutcomeId) {
      throw new Error(
        `Retry outcome mismatch: stored ${current.winningOutcomeId}, requested ${winningOutcomeId}`
      );
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
      if (stake.refundTxId) {
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
        data: { refundTxId: txId },
      });
      await recordLedgerEntry({
        predictionId,
        entryType: 'refund',
        username: stake.username,
        amount: stake.amount.toNumber(),
        txId,
      });
      logger.info(`Refund sent to ${stake.username}: ${txId}`, 'Settlement', { predictionId });
    }

    await prisma.$transaction(async (tx) => {
      // Reset outcome counters since all stakes are refunded
      for (const outcome of prediction.outcomes) {
        await tx.predictionOutcome.update({
          where: { id: outcome.id },
          data: { isWinner: outcome.id === winningOutcomeId, backerCount: 0, totalStaked: 0 },
        });
      }

      await tx.prediction.update({
        where: { id: predictionId },
        data: {
          status: PredictionStatus.REFUNDED,
          winningOutcomeId,
          totalPool: 0,
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
    // Fee broadcast happens before the final SETTLED transaction. If the broadcast
    // succeeds but the final transaction fails, fees are sent but prediction stays
    // in SETTLING. The feeBurnTxId guard prevents re-broadcast on retry;
    // the SETTLING state is designed for exactly this (manual retry to complete).
    const feeOps = buildFeeOps({ burnAmount: settlement.burnAmount }, predictionId);

    if (feeOps.burn && !prediction.feeBurnTxId) {
      const txId = await broadcastHiveEngineOps([feeOps.burn]);
      await prisma.prediction.update({
        where: { id: predictionId },
        data: { feeBurnTxId: txId },
      });
      await recordLedgerEntry({
        predictionId,
        entryType: 'fee_burn',
        username: null,
        amount: settlement.burnAmount,
        txId,
      });
      logger.info(`Fee burn broadcast: ${txId}`, 'Settlement', { predictionId });
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
      await recordLedgerEntry({
        predictionId,
        entryType: 'payout',
        username: payout.username,
        amount: payout.payoutAmount,
        txId,
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
          rewardPoolAmount: 0,
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

    // Badge evaluation for all stakers (fire-and-forget)
    const stakers = [...new Set(prediction.stakes.map((s) => s.username))];
    for (const staker of stakers) {
      evaluateBadgesForAction(staker, 'prediction_settled').catch(() => {});
    }

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
    include: { stakes: true, outcomes: true },
  });

  if (!prediction) {
    throw new Error(`Prediction not found: ${predictionId}`);
  }

  // Atomic lock: transition OPEN, LOCKED, or PENDING_APPROVAL → VOID.
  // If count === 0, either already VOID (retry) or invalid state.
  const lockResult = await prisma.prediction.updateMany({
    where: {
      id: predictionId,
      status: {
        in: [PredictionStatus.OPEN, PredictionStatus.LOCKED, PredictionStatus.PENDING_APPROVAL],
      },
    },
    data: {
      status: PredictionStatus.VOID,
      isVoid: true,
      voidReason: reason,
      ...PROPOSAL_CLEAR_DATA,
    },
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
      if (stake.refundTxId) {
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
        data: { refundTxId: txId },
      });
      await recordLedgerEntry({
        predictionId,
        entryType: 'refund',
        username: stake.username,
        amount: stake.amount.toNumber(),
        txId,
      });
      logger.info(`Refund sent to ${stake.username}: ${txId}`, 'Settlement', { predictionId });
    }

    // Set final status and reset denormalized counters
    await prisma.$transaction(async (tx) => {
      // Reset outcome counters since all stakes are refunded
      for (const outcome of prediction.outcomes) {
        if (outcome.backerCount > 0 || outcome.totalStaked.toNumber() > 0) {
          await tx.predictionOutcome.update({
            where: { id: outcome.id },
            data: { backerCount: 0, totalStaked: 0 },
          });
        }
      }

      await tx.prediction.update({
        where: { id: predictionId },
        data: {
          status: PredictionStatus.REFUNDED,
          totalPool: 0,
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
