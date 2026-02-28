/**
 * HP Delegation API Route
 *
 * POST /api/hive/delegate
 *   Builds a delegate_vesting_shares operation for client-side signing.
 *   Requires active authority — only available for Hive wallet users.
 *   Body: { delegator: string, delegatee: string, amount: number }
 *   amount is in HP (HIVE Power), converted to VESTS server-side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import { createDelegateVestsOperation } from '@/lib/hive-workerbee/shared';
import { withCsrfProtection } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { createRequestContext } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/delegate';

function isValidAccountName(account: string): boolean {
  if (!account || typeof account !== 'string') return false;
  return /^[a-z][a-z0-9.-]{2,15}$/.test(account);
}

interface GlobalProperties {
  total_vesting_fund_hive: string;
  total_vesting_shares: string;
}

function parseAsset(assetString: string): { amount: number; symbol: string } {
  if (!assetString || typeof assetString !== 'string') {
    return { amount: 0, symbol: '' };
  }
  const [amount, symbol] = assetString.split(' ');
  return { amount: parseFloat(amount || '0'), symbol: symbol || '' };
}

function hiveToVests(
  hive: number,
  totalVestingShares: number,
  totalVestingFundHive: number
): number {
  if (totalVestingFundHive === 0) return 0;
  return (hive / totalVestingFundHive) * totalVestingShares;
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
      const { delegator, delegatee, amount } = body;

      if (!delegator || !isValidAccountName(delegator)) {
        return NextResponse.json({ error: 'Valid delegator account is required' }, { status: 400 });
      }

      if (!delegatee || !isValidAccountName(delegatee)) {
        return NextResponse.json({ error: 'Valid delegatee account is required' }, { status: 400 });
      }

      if (delegator === delegatee) {
        return NextResponse.json({ error: 'Cannot delegate to yourself' }, { status: 400 });
      }

      if (user.hiveUsername !== delegator && user.username !== delegator) {
        return NextResponse.json(
          { error: 'Cannot build delegation operations for other accounts' },
          { status: 403 }
        );
      }

      if (typeof amount !== 'number' || amount < 0) {
        return NextResponse.json(
          { error: 'Amount must be a non-negative number (0 to remove delegation)' },
          { status: 400 }
        );
      }

      // Fetch global properties for HIVE→VESTS conversion
      const globalProps = (await makeHiveApiCall(
        'condenser_api',
        'get_dynamic_global_properties'
      )) as GlobalProperties;

      const totalVestingShares = parseAsset(globalProps.total_vesting_shares);
      const totalVestingFundHive = parseAsset(globalProps.total_vesting_fund_hive);

      const vestsAmount = hiveToVests(
        amount,
        totalVestingShares.amount,
        totalVestingFundHive.amount
      );

      const operation = createDelegateVestsOperation(
        delegator,
        delegatee,
        `${vestsAmount.toFixed(6)} VESTS`
      );

      return NextResponse.json({
        success: true,
        operation,
        operationType: 'delegate_vesting_shares',
        hiveAmount: amount.toFixed(3),
        vestsAmount: vestsAmount.toFixed(6),
        message:
          amount > 0
            ? `Delegate ${amount.toFixed(3)} HP (${vestsAmount.toFixed(6)} VESTS) to @${delegatee}`
            : `Remove delegation to @${delegatee}`,
      });
    } catch (error) {
      return ctx.handleError(error);
    }
  });
}
