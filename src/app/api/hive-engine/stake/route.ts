/**
 * MEDALS Staking API Route
 *
 * GET /api/hive-engine/stake?account=username
 *   Returns staking info for a user
 *
 * POST /api/hive-engine/stake
 *   Builds a stake/unstake operation for signing
 *   Body: { action: "stake" | "unstake", quantity: "100.000", account: "username" }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getStakeInfo,
  getPendingUnstakes,
  getDelegationsIn,
  getDelegationsOut,
  getCurrentStakingPool,
  getTotalStaked,
} from '@/lib/hive-engine/tokens';
import {
  buildStakeOp,
  buildUnstakeOp,
  buildCancelUnstakeOp,
  validateOperation,
} from '@/lib/hive-engine/operations';
import { formatQuantity, isValidAccountName, isValidQuantity } from '@/lib/hive-engine/client';
import { MEDALS_CONFIG, CACHE_TTLS } from '@/lib/hive-engine/constants';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { createApiHandler, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * GET - Get staking information
 */
export const GET = createApiHandler('/api/hive-engine/stake', async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account');

  if (!account) {
    return apiError('Account parameter is required', 'VALIDATION_ERROR', 400, {
      requestId: ctx.requestId,
    });
  }

  if (!isValidAccountName(account)) {
    return apiError('Invalid account name', 'VALIDATION_ERROR', 400, {
      requestId: ctx.requestId,
    });
  }

  // Fetch all staking data in parallel
  const [stakeInfo, pendingUnstakes, delegationsIn, delegationsOut, totalStaked] =
    await Promise.all([
      getStakeInfo(account),
      getPendingUnstakes(account),
      getDelegationsIn(account),
      getDelegationsOut(account),
      getTotalStaked(),
    ]);

  // Calculate stake share percentage
  const userStake = stakeInfo?.staked || 0;
  const stakeShare = totalStaked > 0 ? (userStake / totalStaked) * 100 : 0;

  // Get weekly pool info
  const weeklyPool = getCurrentStakingPool();
  const estimatedWeeklyReward = totalStaked > 0 ? (userStake / totalStaked) * weeklyPool : 0;

  const response = {
    account,
    symbol: MEDALS_CONFIG.SYMBOL,
    staked: formatQuantity(stakeInfo?.staked || 0),
    pendingUnstake: formatQuantity(stakeInfo?.pendingUnstake || 0),
    delegatedIn: formatQuantity(stakeInfo?.delegatedIn || 0),
    delegatedOut: formatQuantity(stakeInfo?.delegatedOut || 0),
    effectiveStake: formatQuantity(
      (stakeInfo?.staked || 0) + (stakeInfo?.delegatedIn || 0) - (stakeInfo?.delegatedOut || 0)
    ),
    estimatedAPY: stakeInfo?.estimatedAPY.toFixed(2) || '0.00',
    estimatedWeeklyReward: formatQuantity(estimatedWeeklyReward),
    premiumTier: stakeInfo?.premiumTier || null,
    unstakingCompleteTimestamp: stakeInfo?.unstakingCompleteTimestamp || null,
    stakeShare: stakeShare.toFixed(4),
    totalStakedNetwork: formatQuantity(totalStaked),
    weeklyRewardPool: formatQuantity(weeklyPool),
    pendingUnstakes: pendingUnstakes.map((u) => ({
      txId: u.txID,
      quantity: u.quantity,
      quantityLeft: u.quantityLeft,
      nextTransactionTimestamp: u.nextTransactionTimestamp,
      transactionsLeft: u.numberTransactionsLeft,
    })),
    delegations: {
      in: delegationsIn.map((d) => ({
        from: d.from,
        quantity: d.quantity,
      })),
      out: delegationsOut.map((d) => ({
        to: d.to,
        quantity: d.quantity,
      })),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': `public, s-maxage=${CACHE_TTLS.STAKE_INFO}, stale-while-revalidate=${CACHE_TTLS.STAKE_INFO * 2}`,
    },
  });
});

/**
 * POST - Build stake/unstake operation
 */
export const POST = createApiHandler('/api/hive-engine/stake', async (request, ctx) => {
  return withCsrfProtection(request as NextRequest, async () => {
    // Require authentication
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return apiError('Authentication required', 'UNAUTHORIZED', 401, {
        requestId: ctx.requestId,
      });
    }

    const body = await request.json();
    const { action, quantity, account, txId } = body;

    // Validate account
    if (!account || !isValidAccountName(account)) {
      return apiError('Valid account is required', 'VALIDATION_ERROR', 400, {
        requestId: ctx.requestId,
      });
    }

    // Verify the authenticated user matches the account
    if (user.hiveUsername !== account && user.username !== account) {
      return apiError('Cannot build operations for other accounts', 'FORBIDDEN', 403, {
        requestId: ctx.requestId,
      });
    }

    // Handle different actions
    switch (action) {
      case 'stake': {
        if (!quantity || !isValidQuantity(quantity)) {
          return apiError('Valid quantity is required (e.g., "100.000")', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
        }

        const operation = buildStakeOp(account, quantity);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return apiError(validation.error || 'Invalid operation', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
        }

        return NextResponse.json({
          success: true,
          action: 'stake',
          operation,
          message: `Stake ${quantity} ${MEDALS_CONFIG.SYMBOL}`,
        });
      }

      case 'unstake': {
        if (!quantity || !isValidQuantity(quantity)) {
          return apiError('Valid quantity is required (e.g., "100.000")', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
        }

        const operation = buildUnstakeOp(account, quantity);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return apiError(validation.error || 'Invalid operation', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
        }

        return NextResponse.json({
          success: true,
          action: 'unstake',
          operation,
          message: `Unstake ${quantity} ${MEDALS_CONFIG.SYMBOL}`,
        });
      }

      case 'cancelUnstake': {
        if (!txId || typeof txId !== 'string') {
          return apiError('Transaction ID (txId) is required', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
        }

        const operation = buildCancelUnstakeOp(account, txId);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return apiError(validation.error || 'Invalid operation', 'VALIDATION_ERROR', 400, {
            requestId: ctx.requestId,
          });
        }

        return NextResponse.json({
          success: true,
          action: 'cancelUnstake',
          operation,
          message: `Cancel unstake ${txId}`,
        });
      }

      default:
        return apiError(
          'Invalid action. Use: stake, unstake, or cancelUnstake',
          'VALIDATION_ERROR',
          400,
          { requestId: ctx.requestId }
        );
    }
  });
});
