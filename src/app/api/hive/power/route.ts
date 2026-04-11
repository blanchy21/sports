/**
 * HIVE Power API Route
 *
 * GET /api/hive/power?account=username
 *   Returns power down status for a user
 *
 * POST /api/hive/power
 *   Builds a power up/down operation for signing
 *   Body: { action: "powerUp" | "powerDown" | "cancelPowerDown", account: "username", amount?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { makeHiveApiCall } from '@/lib/hive-workerbee/api';
import {
  createPowerUpOperation,
  createPowerDownOperation,
  createCancelPowerDownOperation,
} from '@/lib/hive-workerbee/wax-helpers';
import { csrfProtected } from '@/lib/api/csrf';
import { getAuthenticatedUserFromSession } from '@/lib/api/session-auth';
import { createApiHandler } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/hive/power';

const hiveAccountName = z.string().regex(/^[a-z][a-z0-9.-]{2,15}$/, 'Invalid Hive account name');

const powerBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('powerUp'),
    account: hiveAccountName,
    amount: z.number().positive().min(0.001, 'Minimum power up amount is 0.001 HIVE'),
    to: hiveAccountName.optional(),
  }),
  z.object({
    action: z.literal('powerDown'),
    account: hiveAccountName,
    amount: z.number().positive(),
  }),
  z.object({
    action: z.literal('cancelPowerDown'),
    account: hiveAccountName,
  }),
]);

// Validate Hive account name
function isValidAccountName(account: string): boolean {
  if (!account || typeof account !== 'string') return false;
  // Hive account names: 3-16 chars, lowercase, alphanumeric, dots, and hyphens
  return /^[a-z][a-z0-9.-]{2,15}$/.test(account);
}

interface HiveAccount {
  name: string;
  balance: string;
  vesting_shares: string;
  delegated_vesting_shares: string;
  received_vesting_shares: string;
  vesting_withdraw_rate: string;
  next_vesting_withdrawal: string;
  to_withdraw: string;
  withdrawn: string;
}

interface GlobalProperties {
  total_vesting_fund_hive: string;
  total_vesting_shares: string;
}

/**
 * Parse asset string to get numeric value
 */
function parseAsset(assetString: string): { amount: number; symbol: string } {
  if (!assetString || typeof assetString !== 'string') {
    return { amount: 0, symbol: 'HIVE' };
  }
  const [amount, symbol] = assetString.split(' ');
  return {
    amount: parseFloat(amount || '0'),
    symbol: symbol || 'HIVE',
  };
}

/**
 * Convert VESTS to HIVE
 */
function vestsToHive(
  vests: number,
  totalVestingShares: number,
  totalVestingFundHive: number
): number {
  if (totalVestingShares === 0) return 0;
  return (vests / totalVestingShares) * totalVestingFundHive;
}

/**
 * Convert HIVE to VESTS
 */
function hiveToVests(
  hive: number,
  totalVestingShares: number,
  totalVestingFundHive: number
): number {
  if (totalVestingFundHive === 0) return 0;
  return (hive / totalVestingFundHive) * totalVestingShares;
}

/**
 * GET - Get power down status
 */
export const GET = createApiHandler(ROUTE, async (request) => {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get('account');

  if (!account) {
    return NextResponse.json({ error: 'Account parameter is required' }, { status: 400 });
  }

  if (!isValidAccountName(account)) {
    return NextResponse.json({ error: 'Invalid account name' }, { status: 400 });
  }

  // Fetch account data and global properties in parallel
  const [accountResult, globalPropsResult] = await Promise.all([
    makeHiveApiCall('condenser_api', 'get_accounts', [[account]]),
    makeHiveApiCall('condenser_api', 'get_dynamic_global_properties'),
  ]);

  const accounts = accountResult as HiveAccount[];
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const accountData = accounts[0];
  const globalProps = globalPropsResult as GlobalProperties;

  // Parse values
  const balance = parseAsset(accountData.balance);
  const vestingShares = parseAsset(accountData.vesting_shares);
  const delegatedVesting = parseAsset(accountData.delegated_vesting_shares);
  const receivedVesting = parseAsset(accountData.received_vesting_shares);
  const withdrawRate = parseAsset(accountData.vesting_withdraw_rate);
  const totalVestingShares = parseAsset(globalProps.total_vesting_shares);
  const totalVestingFundHive = parseAsset(globalProps.total_vesting_fund_hive);

  // Calculate effective vesting (own + received - delegated)
  const effectiveVests = vestingShares.amount + receivedVesting.amount - delegatedVesting.amount;

  // Convert to HIVE Power
  const ownHivePower = vestsToHive(
    vestingShares.amount,
    totalVestingShares.amount,
    totalVestingFundHive.amount
  );
  const effectiveHivePower = vestsToHive(
    effectiveVests,
    totalVestingShares.amount,
    totalVestingFundHive.amount
  );
  const delegatedHivePower = vestsToHive(
    delegatedVesting.amount,
    totalVestingShares.amount,
    totalVestingFundHive.amount
  );
  const receivedHivePower = vestsToHive(
    receivedVesting.amount,
    totalVestingShares.amount,
    totalVestingFundHive.amount
  );

  // Check for active power down
  const toWithdraw = BigInt(accountData.to_withdraw || '0');
  const withdrawn = BigInt(accountData.withdrawn || '0');
  const isPoweringDown = toWithdraw > 0n && toWithdraw > withdrawn;

  let powerDownInfo = null;
  if (isPoweringDown) {
    const remainingVests = Number(toWithdraw - withdrawn) / 1000000; // VESTS are stored as millionths
    const weeklyVests = withdrawRate.amount;
    const weeksRemaining = weeklyVests > 0 ? Math.ceil(remainingVests / weeklyVests) : 0;

    const weeklyHive = vestsToHive(
      weeklyVests,
      totalVestingShares.amount,
      totalVestingFundHive.amount
    );
    const remainingHive = vestsToHive(
      remainingVests,
      totalVestingShares.amount,
      totalVestingFundHive.amount
    );

    powerDownInfo = {
      isActive: true,
      weeklyAmount: weeklyHive.toFixed(3),
      weeklyVests: weeklyVests.toFixed(6),
      remainingAmount: remainingHive.toFixed(3),
      remainingVests: remainingVests.toFixed(6),
      weeksRemaining,
      nextWithdrawal: accountData.next_vesting_withdrawal,
    };
  }

  const response = {
    account,
    liquidHive: balance.amount.toFixed(3),
    hivePower: ownHivePower.toFixed(3),
    effectiveHivePower: effectiveHivePower.toFixed(3),
    delegatedOut: delegatedHivePower.toFixed(3),
    delegatedIn: receivedHivePower.toFixed(3),
    vestingShares: vestingShares.amount.toFixed(6),
    powerDown: powerDownInfo || { isActive: false },
    // Conversion rates for UI
    conversionRate: {
      vestsPerHive: hiveToVests(1, totalVestingShares.amount, totalVestingFundHive.amount).toFixed(
        6
      ),
      hivePerVest: vestsToHive(1, totalVestingShares.amount, totalVestingFundHive.amount).toFixed(
        6
      ),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
});

/**
 * POST - Build power up/down operation
 */
export const POST = csrfProtected(
  createApiHandler(ROUTE, async (request) => {
    // Require authentication for financial operations
    const user = await getAuthenticatedUserFromSession(request as NextRequest);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let parsed;
    try {
      parsed = powerBodySchema.parse(await request.json());
    } catch (err) {
      const message = err instanceof z.ZodError ? err.issues[0]?.message : 'Invalid request body';
      return NextResponse.json({ error: message ?? 'Invalid request body' }, { status: 400 });
    }

    const { action, account } = parsed;

    // Verify the authenticated user matches the account
    if (user.hiveUsername !== account && user.username !== account) {
      return NextResponse.json(
        { error: 'Cannot build operations for other accounts' },
        { status: 403 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'powerUp': {
        const { amount, to } = parsed;
        const operation = createPowerUpOperation({
          from: account,
          to: to || account,
          amount,
        });

        return NextResponse.json({
          success: true,
          action: 'powerUp',
          operation,
          operationType: 'transfer_to_vesting',
          message: `Power up ${amount.toFixed(3)} HIVE`,
        });
      }

      case 'powerDown': {
        const { amount } = parsed;

        // Fetch global properties to convert HIVE to VESTS
        const globalProps = (await makeHiveApiCall(
          'condenser_api',
          'get_dynamic_global_properties'
        )) as GlobalProperties;

        const totalVestingShares = parseAsset(globalProps.total_vesting_shares);
        const totalVestingFundHive = parseAsset(globalProps.total_vesting_fund_hive);

        // Convert HIVE amount to VESTS
        const vestsAmount = hiveToVests(
          amount,
          totalVestingShares.amount,
          totalVestingFundHive.amount
        );

        const operation = createPowerDownOperation({
          account,
          vestingShares: vestsAmount,
        });

        return NextResponse.json({
          success: true,
          action: 'powerDown',
          operation,
          operationType: 'withdraw_vesting',
          hiveAmount: amount.toFixed(3),
          vestsAmount: vestsAmount.toFixed(6),
          message: `Start power down of ${amount.toFixed(3)} HIVE (${vestsAmount.toFixed(6)} VESTS) over 13 weeks`,
        });
      }

      case 'cancelPowerDown': {
        const operation = createCancelPowerDownOperation(account);

        return NextResponse.json({
          success: true,
          action: 'cancelPowerDown',
          operation,
          operationType: 'withdraw_vesting',
          message: 'Cancel active power down',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: powerUp, powerDown, or cancelPowerDown' },
          { status: 400 }
        );
    }
  })
);
