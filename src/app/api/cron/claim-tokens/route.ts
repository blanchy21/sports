import { NextResponse } from 'next/server';
import { Client, PrivateKey } from '@hiveio/dhive';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dhive = new Client(HIVE_NODES);

const ACCOUNT_CREATOR = process.env.ACCOUNT_CREATOR ?? 'niallon11';
const OPERATIONS_ACCOUNT = process.env.OPERATIONS_ACCOUNT ?? 'sp-blockrewards';
const LOW_TOKEN_THRESHOLD = 50;

/**
 * Cron endpoint for claiming account creation tokens (ACTs) via RC.
 *
 * Runs every 6 hours. When @niallon11's pending tokens drop below 50,
 * broadcasts a `claim_account` from @sp-blockrewards using RC (zero HIVE fee).
 *
 * Gracefully handles missing OPERATIONS_ACTIVE_KEY — expected during early deployment.
 */
export async function GET() {
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  console.log('[Cron:claim-tokens] Starting ACT claim check...');

  const results = {
    tokensRemaining: 0,
    claimed: false,
    errors: [] as string[],
  };

  try {
    // Check current token balance on the creator account
    const [account] = await dhive.database.getAccounts([ACCOUNT_CREATOR]);
    if (!account) {
      throw new Error(`Creator account @${ACCOUNT_CREATOR} not found`);
    }

    results.tokensRemaining = (
      account as unknown as { pending_claimed_accounts: number }
    ).pending_claimed_accounts;

    console.log(
      `[Cron:claim-tokens] @${ACCOUNT_CREATOR} has ${results.tokensRemaining} pending tokens`
    );

    // If tokens are above threshold, no action needed
    if (results.tokensRemaining > LOW_TOKEN_THRESHOLD) {
      console.log('[Cron:claim-tokens] Token supply healthy, skipping claim');
      return NextResponse.json({
        success: true,
        message: `Token supply healthy (${results.tokensRemaining} remaining)`,
        results,
      });
    }

    // Tokens are low — attempt to claim one via RC
    console.log(
      `[Cron:claim-tokens] Tokens below threshold (${LOW_TOKEN_THRESHOLD}), attempting RC claim...`
    );

    const activeKey = process.env.OPERATIONS_ACTIVE_KEY;
    if (!activeKey) {
      console.warn(
        '[Cron:claim-tokens] OPERATIONS_ACTIVE_KEY not configured — skipping claim. ' +
          'This is expected during early deployment.'
      );
      return NextResponse.json({
        success: true,
        message: 'Tokens low but OPERATIONS_ACTIVE_KEY not configured — skipped',
        results,
      });
    }

    // Broadcast claim_account with zero fee (uses RC)
    const claimOp: [string, object] = [
      'claim_account',
      {
        creator: OPERATIONS_ACCOUNT,
        fee: '0.000 HIVE',
        extensions: [],
      },
    ];

    const key = PrivateKey.fromString(activeKey);
    await dhive.broadcast.sendOperations([claimOp as never], key);

    results.claimed = true;
    console.log(`[Cron:claim-tokens] Successfully claimed 1 ACT for @${OPERATIONS_ACCOUNT}`);

    return NextResponse.json({
      success: true,
      message: 'Account creation token claimed via RC',
      results,
    });
  } catch (error) {
    console.error('[Cron:claim-tokens] Error:', error);
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
