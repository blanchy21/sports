/**
 * POST /api/contests/[slug]/settle — Trigger settlement (admin-only)
 *
 * Calculates prize distribution, broadcasts Hive Engine token transfers,
 * then marks the contest as SETTLED. Stays in CALCULATING on broadcast
 * failure so retries skip already-completed steps (idempotent).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api/api-handler';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { extractPathParam } from '@/lib/api/route-params';
import { requireAdmin } from '@/lib/admin/config';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/api-errors';
import { prisma } from '@/lib/db/prisma';
import { calculateSettlement } from '@/lib/contests/settlement';
import { PRIZE_MODELS } from '@/lib/contests/constants';
import {
  buildPlatformFeeOp,
  buildCreatorFeeOp,
  buildPrizePayoutOps,
  buildEntryFeeBurnOp,
  buildFixedPrizePayoutOps,
} from '@/lib/contests/escrow';
import { broadcastHiveEngineOps } from '@/lib/predictions/settlement';

export const POST = createApiHandler('/api/contests/[slug]/settle', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user || !requireAdmin(user)) {
      throw new ForbiddenError('Admin access required');
    }

    const slug = extractPathParam(request.url, 'contests') ?? '';

    let contest = await prisma.contest.findUnique({
      where: { slug },
      include: { entries: { select: { id: true, payoutTxId: true, username: true } } },
    });
    if (!contest) throw new NotFoundError('Contest not found');

    // Atomic lock: ACTIVE → CALCULATING
    if (contest.status === 'ACTIVE') {
      const locked = await prisma.contest.updateMany({
        where: { id: contest.id, status: 'ACTIVE' },
        data: { status: 'CALCULATING' },
      });

      if (locked.count === 0) {
        throw new ValidationError('Contest state changed concurrently, please retry');
      }
    } else if (contest.status !== 'CALCULATING') {
      throw new ValidationError(`Contest must be ACTIVE to settle, got: ${contest.status}`);
    }

    // Check all matches have results
    const pendingMatches = await prisma.contestMatch.count({
      where: { contestId: contest.id, homeScore: null },
    });

    if (pendingMatches > 0) {
      // Revert to ACTIVE if not all matches done
      await prisma.contest.update({
        where: { id: contest.id },
        data: { status: 'ACTIVE' },
      });
      throw new ValidationError(`${pendingMatches} matches still need results entered`);
    }

    const body = await request.json().catch(() => ({}));
    const actualTotalGoals =
      typeof body.actualTotalGoals === 'number' ? body.actualTotalGoals : undefined;

    // Calculate settlement
    const result = await calculateSettlement(contest.id, {
      actualTotalGoals,
    });

    // Re-fetch contest to get latest tx IDs (in case of retry)
    contest = (await prisma.contest.findUnique({
      where: { id: contest.id },
      include: { entries: { select: { id: true, payoutTxId: true, username: true } } },
    }))!;

    const isFixed = contest.prizeModel === PRIZE_MODELS.FIXED;

    // --- Broadcast token transfers ---
    // Each step is idempotent: tx IDs stored in DB prevent re-broadcast on retry.

    if (isFixed) {
      // FIXED model:
      // 1. Burn all collected entry fees (escrow → null)
      if (result.entryFeesCollected.toNumber() > 0 && !contest.entryFeeBurnTxId) {
        const op = buildEntryFeeBurnOp(result.entryFeesCollected.toNumber(), contest.id);
        const txId = await broadcastHiveEngineOps([op]);
        await prisma.contest.update({
          where: { id: contest.id },
          data: { entryFeeBurnTxId: txId },
        });
        ctx.log.info('Entry fees burned', { contestId: contest.id, txId });
      }

      // 2. Pay prizes from sportsblock → winners
      for (const placement of result.placements) {
        const entry = contest.entries.find((e) => e.id === placement.entryId);
        if (entry?.payoutTxId) continue; // Already paid

        const [op] = buildFixedPrizePayoutOps([
          {
            username: placement.username,
            amount: placement.payoutAmount,
            contestId: contest.id,
            placement: placement.placement,
          },
        ]);
        const txId = await broadcastHiveEngineOps([op]);
        await prisma.contestEntry.update({
          where: { id: placement.entryId },
          data: { payoutTxId: txId },
        });
        ctx.log.info('Fixed prize paid', {
          contestId: contest.id,
          username: placement.username,
          placement: placement.placement,
          txId,
        });
      }
    } else {
      // FEE_FUNDED model:
      // 1. Burn platform fee (escrow → null)
      if (result.platformFee.toNumber() > 0 && !contest.feeBurnTxId) {
        const op = buildPlatformFeeOp(result.platformFee, contest.id);
        const txId = await broadcastHiveEngineOps([op]);
        await prisma.contest.update({
          where: { id: contest.id },
          data: { feeBurnTxId: txId },
        });
        ctx.log.info('Platform fee burned', { contestId: contest.id, txId });
      }

      // 2. Send creator fee (escrow → creator)
      // Use escrow ledger to track (no dedicated column needed — single op)
      if (result.creatorFee.toNumber() > 0) {
        const existingCreatorFee = await prisma.contestEscrowLedger.findFirst({
          where: { contestId: contest.id, entryType: 'creator_fee' },
        });
        if (!existingCreatorFee) {
          const op = buildCreatorFeeOp(contest.creatorUsername, result.creatorFee, contest.id);
          const txId = await broadcastHiveEngineOps([op]);
          await prisma.contestEscrowLedger.create({
            data: {
              contestId: contest.id,
              entryType: 'creator_fee',
              username: contest.creatorUsername,
              amount: result.creatorFee,
              txId,
            },
          });
          ctx.log.info('Creator fee paid', {
            contestId: contest.id,
            creator: contest.creatorUsername,
            txId,
          });
        }
      }

      // 3. Pay prizes from escrow → winners
      for (const placement of result.placements) {
        const entry = contest.entries.find((e) => e.id === placement.entryId);
        if (entry?.payoutTxId) continue; // Already paid

        const [op] = buildPrizePayoutOps([
          {
            username: placement.username,
            amount: placement.payoutAmount,
            contestId: contest.id,
            placement: placement.placement,
          },
        ]);
        const txId = await broadcastHiveEngineOps([op]);
        await prisma.contestEntry.update({
          where: { id: placement.entryId },
          data: { payoutTxId: txId },
        });
        ctx.log.info('Prize paid', {
          contestId: contest.id,
          username: placement.username,
          placement: placement.placement,
          txId,
        });
      }
    }

    // Mark as settled
    await prisma.contest.update({
      where: { id: contest.id },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
        settledBy: user.username,
      },
    });

    ctx.log.info('Contest settled', {
      contestId: contest.id,
      slug,
      prizeModel: contest.prizeModel,
      placements: result.placements.length,
      prizePool: result.prizePoolNet.toString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        contestId: contest.id,
        status: 'SETTLED',
        prizeModel: contest.prizeModel,
        platformFee: result.platformFee.toNumber(),
        creatorFee: result.creatorFee.toNumber(),
        prizePoolNet: result.prizePoolNet.toNumber(),
        entryFeesCollected: result.entryFeesCollected.toNumber(),
        placements: result.placements.map((p) => ({
          placement: p.placement,
          username: p.username,
          totalScore: p.totalScore,
          payoutAmount: p.payoutAmount.toNumber(),
        })),
      },
    });
  });
});
