import { NextResponse } from 'next/server';
import { Client, PrivateKey } from '@hiveio/dhive';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dhive = new Client(HIVE_NODES);

const OPERATIONS_ACCOUNT = process.env.OPERATIONS_ACCOUNT ?? 'sp-blockrewards';
const HP_GRADUATION_THRESHOLD = 15; // HP required before revoking RC delegation
const BATCH_SIZE = 50;

/**
 * Cron endpoint for graduating custodial users.
 *
 * Runs weekly (Sunday 3am). For each non-graduated custodial user with a Hive account:
 * 1. Fetches on-chain HP
 * 2. If HP >= 15 → revokes RC delegation and marks graduated in DB
 *
 * Frees RC capacity on @sp-blockrewards for new custodial users.
 */
export async function GET() {
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  console.log('[Cron:check-graduations] Starting graduation check...');

  const results = {
    checked: 0,
    graduated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Fetch non-graduated custodial users who have a Hive account
    const users = await prisma.custodialUser.findMany({
      where: {
        isGraduated: false,
        hiveUsername: { not: null },
      },
      select: {
        id: true,
        hiveUsername: true,
      },
      take: BATCH_SIZE,
    });

    if (users.length === 0) {
      console.log('[Cron:check-graduations] No eligible users to check');
      return NextResponse.json({
        success: true,
        message: 'No eligible users to check',
        results,
      });
    }

    console.log(`[Cron:check-graduations] Checking ${users.length} custodial users...`);

    // Batch-fetch Hive accounts (dhive supports up to 50 at once)
    const usernames = users.map((u) => u.hiveUsername!);
    const accounts = await dhive.database.getAccounts(usernames);
    const globalProps = await dhive.database.getDynamicGlobalProperties();

    // Parse global props for HP calculation
    const totalVestingShares = parseFloat(
      (globalProps.total_vesting_shares as unknown as string).split(' ')[0]
    );
    const totalVestingFundHive = parseFloat(
      (globalProps.total_vesting_fund_hive as unknown as string).split(' ')[0]
    );

    // Build a lookup from username → account
    const accountMap = new Map(accounts.map((a) => [a.name, a]));

    for (const user of users) {
      results.checked++;

      const account = accountMap.get(user.hiveUsername!);
      if (!account) {
        console.warn(
          `[Cron:check-graduations] Account @${user.hiveUsername} not found on-chain, skipping`
        );
        results.skipped++;
        continue;
      }

      // Calculate HP from vesting_shares
      const vestingShares = parseFloat((account.vesting_shares as unknown as string).split(' ')[0]);
      const hp = (vestingShares / totalVestingShares) * totalVestingFundHive;

      if (hp < HP_GRADUATION_THRESHOLD) {
        results.skipped++;
        continue;
      }

      // User qualifies for graduation — revoke RC delegation
      console.log(
        `[Cron:check-graduations] @${user.hiveUsername} has ${hp.toFixed(3)} HP, graduating...`
      );

      try {
        const postingKey = process.env.OPERATIONS_POSTING_KEY;
        if (!postingKey) {
          results.errors.push(
            `OPERATIONS_POSTING_KEY not configured — cannot revoke RC for @${user.hiveUsername}`
          );
          results.skipped++;
          continue;
        }

        // Revoke RC delegation (max_rc: 0)
        const revokeOp: [string, object] = [
          'custom_json',
          {
            required_auths: [],
            required_posting_auths: [OPERATIONS_ACCOUNT],
            id: 'rc',
            json: JSON.stringify([
              'delegate_rc',
              {
                from: OPERATIONS_ACCOUNT,
                delegatees: [user.hiveUsername],
                max_rc: 0,
              },
            ]),
          },
        ];

        const key = PrivateKey.fromString(postingKey);
        await dhive.broadcast.sendOperations([revokeOp as never], key);

        // Mark graduated in DB
        await prisma.custodialUser.update({
          where: { id: user.id },
          data: { isGraduated: true },
        });

        results.graduated++;
        console.log(`[Cron:check-graduations] @${user.hiveUsername} graduated successfully`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.errors.push(`Failed to graduate @${user.hiveUsername}: ${message}`);
        console.error(`[Cron:check-graduations] Error graduating @${user.hiveUsername}:`, error);
      }
    }

    console.log('[Cron:check-graduations] Graduation check completed', results);

    return NextResponse.json({
      success: true,
      message: 'Graduation check completed',
      results,
    });
  } catch (error) {
    console.error('[Cron:check-graduations] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.errors.push(message);

    return NextResponse.json(
      {
        success: false,
        error: message,
        partialResults: results,
      },
      { status: 500 }
    );
  }
}
