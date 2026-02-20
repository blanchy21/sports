import { NextResponse } from 'next/server';
import { Client, PrivateKey } from '@hiveio/dhive';
import { verifyCronRequest, createUnauthorizedResponse } from '@/lib/api/cron-auth';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const dhive = new Client(HIVE_NODES);

const ACCOUNT_CREATOR = process.env.ACCOUNT_CREATOR ?? 'niallon11';
const LOW_TOKEN_THRESHOLD = 50;

/**
 * Cron endpoint for claiming account creation tokens (ACTs) via RC.
 *
 * Runs every 6 hours. When @niallon11's pending tokens drop below 50,
 * broadcasts a `claim_account` from @sp-blockrewards using RC (zero HIVE fee).
 *
 * Requires ACCOUNT_CREATOR_ACTIVE_KEY to broadcast the claim.
 */
export async function GET() {
  if (!(await verifyCronRequest())) {
    return NextResponse.json(createUnauthorizedResponse(), { status: 401 });
  }

  logger.info('Starting ACT claim check', 'cron:claim-tokens');

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

    logger.info(
      `@${ACCOUNT_CREATOR} has ${results.tokensRemaining} pending tokens`,
      'cron:claim-tokens'
    );

    // If tokens are above threshold, no action needed
    if (results.tokensRemaining > LOW_TOKEN_THRESHOLD) {
      logger.info('Token supply healthy, skipping claim', 'cron:claim-tokens');
      return NextResponse.json({
        success: true,
        message: `Token supply healthy (${results.tokensRemaining} remaining)`,
        results,
      });
    }

    // Tokens are low — attempt to claim one via RC
    logger.info(
      `Tokens below threshold (${LOW_TOKEN_THRESHOLD}), attempting RC claim`,
      'cron:claim-tokens'
    );

    // Broadcast claim_account for the creator account (must match account-creation.ts)
    const creatorActiveKey = process.env.ACCOUNT_CREATOR_ACTIVE_KEY;
    if (!creatorActiveKey) {
      logger.warn(
        'ACCOUNT_CREATOR_ACTIVE_KEY not configured — skipping claim',
        'cron:claim-tokens'
      );
      return NextResponse.json({
        success: true,
        message: 'Tokens low but ACCOUNT_CREATOR_ACTIVE_KEY not configured — skipped',
        results,
      });
    }

    const claimOp: [string, object] = [
      'claim_account',
      {
        creator: ACCOUNT_CREATOR,
        fee: '0.000 HIVE',
        extensions: [],
      },
    ];

    const key = PrivateKey.fromString(creatorActiveKey);
    await dhive.broadcast.sendOperations([claimOp as never], key);

    results.claimed = true;
    logger.info(`Successfully claimed 1 ACT for @${ACCOUNT_CREATOR}`, 'cron:claim-tokens');

    return NextResponse.json({
      success: true,
      message: 'Account creation token claimed via RC',
      results,
    });
  } catch (error) {
    logger.error('Claim tokens failed', 'cron:claim-tokens', error);
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
