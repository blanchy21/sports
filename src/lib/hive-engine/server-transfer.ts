/**
 * Server-side MEDALS transfer from @sportsblock.
 *
 * Broadcasts a single MEDALS transfer using the SPORTSBLOCK_ACTIVE_KEY.
 * Used by curation rewards, contest payouts, IPL BB payouts, and any other
 * flow that pays MEDALS out of the @sportsblock treasury.
 *
 * This is server-only. Client-signed transfers (Keychain/HiveSigner) use the
 * builder functions in `@/lib/hive-engine/operations.ts` instead.
 */

import { PrivateKey } from '@hiveio/dhive';
import { getDhiveClient } from '@/lib/hive/dhive-client';
import { logger } from '@/lib/logger';

const REWARDS_ACCOUNT = 'sportsblock';

/**
 * Transfer MEDALS from @sportsblock to a recipient.
 *
 * Throws on any failure — including a missing SPORTSBLOCK_ACTIVE_KEY — so
 * callers never silently succeed with a null transaction id. A missing key
 * is an operator error and must not be swallowed.
 */
export async function transferMedalsFromSportsblock(
  recipient: string,
  amount: number,
  memo: string
): Promise<string> {
  const activeKeyWif = process.env.SPORTSBLOCK_ACTIVE_KEY;
  if (!activeKeyWif) {
    throw new Error(
      'SPORTSBLOCK_ACTIVE_KEY is not configured. Cannot broadcast MEDALS transfer from @sportsblock.'
    );
  }

  const activeKey = PrivateKey.fromString(activeKeyWif);
  const dhive = getDhiveClient();

  const payload = {
    contractName: 'tokens',
    contractAction: 'transfer',
    contractPayload: {
      symbol: 'MEDALS',
      to: recipient,
      quantity: amount.toFixed(3),
      memo,
    },
  };

  const op: [string, Record<string, unknown>] = [
    'custom_json',
    {
      id: 'ssc-mainnet-hive',
      required_auths: [REWARDS_ACCOUNT],
      required_posting_auths: [] as string[],
      json: JSON.stringify(payload),
    },
  ];

  logger.info(
    `Broadcasting MEDALS transfer from @sportsblock: ${amount} MEDALS → @${recipient}`,
    'hive-engine:server-transfer'
  );

  const result = await dhive.broadcast.sendOperations([op] as never[], activeKey);
  return result.id;
}
