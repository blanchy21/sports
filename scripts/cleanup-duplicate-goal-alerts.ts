/**
 * One-time cleanup script: delete 45 duplicate goal alerts from the
 * Borussia Dortmund vs FC Augsburg match thread (event 746951, 2026-03-14).
 *
 * Must be run in an environment with SPORTSBITES_POSTING_KEY set.
 *
 * Usage:
 *   npx tsx scripts/cleanup-duplicate-goal-alerts.ts [--dry-run]
 */

import { PrivateKey, Client } from '@hiveio/dhive';

const AUTHOR = 'sportsbites';
const EVENT_ID = '746951';
const HIVE_API = 'https://api.hive.blog';

// The two original alerts to KEEP (first occurrence of each goal)
const KEEP_PERMLINKS = new Set([
  'goal-alert-746951-1773502122355', // Adeyemi 13' (first)
  'goal-alert-746951-1773503449476', // Reggiani 59' (first)
]);

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const postingKey = process.env.SPORTSBITES_POSTING_KEY;

  if (!postingKey && !dryRun) {
    console.error('ERROR: SPORTSBITES_POSTING_KEY not set. Use --dry-run to preview.');
    process.exit(1);
  }

  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE — will delete comments'}`);

  // Fetch the match thread discussion
  const response = await fetch(HIVE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'bridge.get_discussion',
      params: { author: AUTHOR, permlink: `match-thread-${EVENT_ID}`, observer: '' },
      id: 1,
    }),
  });

  const data = await response.json();
  const discussion = data.result || {};

  // Find all goal-alert permlinks to delete
  const toDelete: string[] = [];
  for (const [, post] of Object.entries(discussion)) {
    const p = post as { permlink: string; author: string };
    if (
      p.author === AUTHOR &&
      p.permlink.startsWith('goal-alert-') &&
      !KEEP_PERMLINKS.has(p.permlink)
    ) {
      toDelete.push(p.permlink);
    }
  }

  console.log(`Found ${toDelete.length} duplicate goal alerts to delete`);
  console.log(`Keeping ${KEEP_PERMLINKS.size} original alerts`);

  if (toDelete.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  if (dryRun) {
    console.log('\nWould delete:');
    for (const permlink of toDelete) {
      console.log(`  ${permlink}`);
    }
    return;
  }

  // Delete each duplicate using delete_comment operation
  const client = new Client([HIVE_API, 'https://api.deathwing.me', 'https://anyx.io']);
  const key = PrivateKey.from(postingKey!);

  let deleted = 0;
  let errors = 0;

  for (const permlink of toDelete) {
    try {
      await client.broadcast.sendOperations(
        [['delete_comment', { author: AUTHOR, permlink }]],
        key
      );
      deleted++;
      console.log(`  Deleted: ${permlink} (${deleted}/${toDelete.length})`);

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 3500));
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Failed: ${permlink} — ${msg}`);
    }
  }

  console.log(`\nDone: ${deleted} deleted, ${errors} errors`);
}

main().catch(console.error);
