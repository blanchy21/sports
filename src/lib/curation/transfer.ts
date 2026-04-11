/**
 * MEDALS Transfer for Curation
 *
 * Broadcasts a single MEDALS transfer from @sportsblock to a post author.
 * Uses the same Hive Engine custom_json pattern as the staking rewards cron.
 */

import { PrivateKey } from '@hiveio/dhive';
import { getDhiveClient } from '@/lib/hive/dhive-client';
import { logger } from '@/lib/logger';

const REWARDS_ACCOUNT = 'sportsblock';

/**
 * Transfer MEDALS from @sportsblock to a recipient.
 * Requires SPORTSBLOCK_ACTIVE_KEY env var.
 *
 * @returns Transaction ID on success, null if no active key configured.
 * @throws On broadcast failure.
 */
export async function transferCurationMedals(
  recipient: string,
  amount: number,
  memo: string
): Promise<string | null> {
  const activeKeyWif = process.env.SPORTSBLOCK_ACTIVE_KEY;
  if (!activeKeyWif) {
    logger.warn('SPORTSBLOCK_ACTIVE_KEY not set — curation transfer skipped', 'curation:transfer');
    return null;
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
    `Broadcasting curation transfer: ${amount} MEDALS → ${recipient}`,
    'curation:transfer'
  );

  const result = await dhive.broadcast.sendOperations([op] as never[], activeKey);
  return result.id;
}
