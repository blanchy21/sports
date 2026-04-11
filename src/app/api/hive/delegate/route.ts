/**
 * HP Delegation API Route
 *
 * POST /api/hive/delegate
 *   Builds a delegate_vesting_shares operation for client-side signing.
 *   Requires active authority -- only available for Hive wallet users.
 *   Body: { delegator: string, delegatee: string, amount: number }
 *   amount is in HP (HIVE Power), converted to VESTS server-side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import { createDelegateVestsOperation } from '@/lib/hive-workerbee/shared';
import { csrfProtected } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { createApiHandler } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/delegate';

const hiveAccountName = z.string().regex(/^[a-z][a-z0-9.-]{2,15}$/, 'Invalid Hive account name');

const delegateBodySchema = z
  .object({
    delegator: hiveAccountName,
    delegatee: hiveAccountName,
    amount: z.number().min(0, 'Amount must be non-negative (0 removes delegation)'),
  })
  .refine((data) => data.delegator !== data.delegatee, {
    message: 'Cannot delegate to yourself',
  });

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

export const POST = csrfProtected(
  createApiHandler(ROUTE, async (request) => {
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let parsed;
    try {
      parsed = delegateBodySchema.parse(await request.json());
    } catch (err) {
      const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request body';
      return NextResponse.json({ error: message ?? 'Invalid request body' }, { status: 400 });
    }
    const { delegator, delegatee, amount } = parsed;

    if (user.hiveUsername !== delegator && user.username !== delegator) {
      return NextResponse.json(
        { error: 'Cannot build delegation operations for other accounts' },
        { status: 403 }
      );
    }

    // Fetch global properties for HIVE->VESTS conversion
    const globalProps = (await makeHiveApiCall(
      'condenser_api',
      'get_dynamic_global_properties'
    )) as GlobalProperties;

    const totalVestingShares = parseAsset(globalProps.total_vesting_shares);
    const totalVestingFundHive = parseAsset(globalProps.total_vesting_fund_hive);

    const vestsAmount = hiveToVests(amount, totalVestingShares.amount, totalVestingFundHive.amount);

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
  })
);
