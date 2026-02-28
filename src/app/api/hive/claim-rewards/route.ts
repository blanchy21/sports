/**
 * Claim Rewards API Route
 *
 * POST /api/hive/claim-rewards
 *   Fetches pending rewards for the authenticated user and returns
 *   a claim_reward_balance operation for client-side signing,
 *   or broadcasts via signing relay for custodial users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import { createClaimRewardsOperation } from '@/lib/hive-workerbee/shared';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { createRequestContext } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/claim-rewards';

function isValidAccountName(account: string): boolean {
  if (!account || typeof account !== 'string') return false;
  return /^[a-z][a-z0-9.-]{2,15}$/.test(account);
}

interface HiveAccount {
  name: string;
  reward_hive_balance: string;
  reward_hbd_balance: string;
  reward_vesting_balance: string;
}

function parseAsset(assetString: string): { amount: number; symbol: string } {
  if (!assetString || typeof assetString !== 'string') {
    return { amount: 0, symbol: '' };
  }
  const [amount, symbol] = assetString.split(' ');
  return { amount: parseFloat(amount || '0'), symbol: symbol || '' };
}

export async function POST(request: NextRequest) {
  return withCsrfProtection(request, async () => {
    const ctx = createRequestContext(ROUTE);

    const user = await getAuthenticatedUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
      const body = await request.json();
      const { account } = body;

      if (!account || !isValidAccountName(account)) {
        return NextResponse.json({ error: 'Valid account is required' }, { status: 400 });
      }

      if (user.hiveUsername !== account && user.username !== account) {
        return NextResponse.json(
          { error: 'Cannot claim rewards for other accounts' },
          { status: 403 }
        );
      }

      // Fetch account to get pending rewards
      const accountResult = await makeHiveApiCall('condenser_api', 'get_accounts', [[account]]);
      const accounts = accountResult as HiveAccount[];

      if (!accounts || accounts.length === 0) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      const accountData = accounts[0];
      const rewardHive = parseAsset(accountData.reward_hive_balance);
      const rewardHbd = parseAsset(accountData.reward_hbd_balance);
      const rewardVesting = parseAsset(accountData.reward_vesting_balance);

      // Check if there are any rewards to claim
      if (rewardHive.amount === 0 && rewardHbd.amount === 0 && rewardVesting.amount === 0) {
        return NextResponse.json({ error: 'No pending rewards to claim' }, { status: 400 });
      }

      const operation = createClaimRewardsOperation(
        account,
        accountData.reward_hive_balance,
        accountData.reward_hbd_balance,
        accountData.reward_vesting_balance
      );

      return NextResponse.json({
        success: true,
        operation,
        operationType: 'claim_reward_balance',
        rewards: {
          hive: accountData.reward_hive_balance,
          hbd: accountData.reward_hbd_balance,
          vesting: accountData.reward_vesting_balance,
        },
        message: `Claim ${accountData.reward_hive_balance}, ${accountData.reward_hbd_balance}, ${accountData.reward_vesting_balance}`,
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
