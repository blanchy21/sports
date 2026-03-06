/**
 * Posting Authority Helpers
 *
 * Check and grant posting authority to @sportsblock so we can
 * publish scheduled posts on behalf of users (Peakd model).
 */

import { getDhiveClient } from '@/lib/hive/dhive-client';

const SPORTSBLOCK_ACCOUNT = 'sportsblock';

/**
 * Check whether @sportsblock is in the user's posting account_auths.
 * Returns true if authority is already granted.
 */
export async function checkPostingAuthority(username: string): Promise<boolean> {
  const client = getDhiveClient();
  const [account] = await client.database.getAccounts([username]);
  if (!account) return false;

  return account.posting.account_auths.some(
    ([auth]: [string, number]) => auth === SPORTSBLOCK_ACCOUNT
  );
}

/**
 * Build the account_update2 operation that adds @sportsblock
 * to the user's posting authority list.
 *
 * The user must sign this with their ACTIVE key (via Keychain).
 * We preserve existing authorities and just append sportsblock.
 */
export function buildGrantAuthorityOp(
  username: string,
  currentPosting: {
    weight_threshold: number;
    account_auths: [string, number][];
    key_auths: [string, number][];
  }
) {
  // Don't add duplicate
  const alreadyHas = currentPosting.account_auths.some(
    ([auth]) => auth === SPORTSBLOCK_ACCOUNT
  );

  const newAccountAuths = alreadyHas
    ? currentPosting.account_auths
    : [...currentPosting.account_auths, [SPORTSBLOCK_ACCOUNT, 1] as [string, number]].sort(
        ([a], [b]) => a.localeCompare(b)
      );

  return [
    'account_update2',
    {
      account: username,
      json_metadata: '',
      posting_json_metadata: '',
      extensions: [],
      posting: {
        weight_threshold: currentPosting.weight_threshold,
        account_auths: newAccountAuths,
        key_auths: currentPosting.key_auths,
      },
    },
  ] as const;
}
