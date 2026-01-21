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

export const dynamic = 'force-dynamic';

/**
 * GET - Get staking information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account');

    if (!account) {
      return NextResponse.json(
        { error: 'Account parameter is required' },
        { status: 400 }
      );
    }

    if (!isValidAccountName(account)) {
      return NextResponse.json(
        { error: 'Invalid account name' },
        { status: 400 }
      );
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
        (stakeInfo?.staked || 0) +
          (stakeInfo?.delegatedIn || 0) -
          (stakeInfo?.delegatedOut || 0)
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
  } catch (error) {
    console.error('[API] Error fetching stake info:', error);
    // Sanitize error response - don't expose internal details
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch staking information. Please try again later.',
        code: 'STAKE_FETCH_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Build stake/unstake operation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, quantity, account, txId } = body;

    // Validate account
    if (!account || !isValidAccountName(account)) {
      return NextResponse.json(
        { error: 'Valid account is required' },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'stake': {
        if (!quantity || !isValidQuantity(quantity)) {
          return NextResponse.json(
            { error: 'Valid quantity is required (e.g., "100.000")' },
            { status: 400 }
          );
        }

        const operation = buildStakeOp(account, quantity);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
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
          return NextResponse.json(
            { error: 'Valid quantity is required (e.g., "100.000")' },
            { status: 400 }
          );
        }

        const operation = buildUnstakeOp(account, quantity);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
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
          return NextResponse.json(
            { error: 'Transaction ID (txId) is required' },
            { status: 400 }
          );
        }

        const operation = buildCancelUnstakeOp(account, txId);
        const validation = validateOperation(operation);

        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          action: 'cancelUnstake',
          operation,
          message: `Cancel unstake ${txId}`,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: stake, unstake, or cancelUnstake' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Error building stake operation:', error);
    // Sanitize error response - don't expose internal details
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to build staking operation. Please check your input and try again.',
        code: 'STAKE_BUILD_ERROR',
      },
      { status: 500 }
    );
  }
}
