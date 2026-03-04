/**
 * Shared @hiveio/dhive Client singleton.
 *
 * Every server-side file that needs a dhive Client should import
 * `getDhiveClient()` from this module instead of creating its own instance.
 * This avoids 8+ separate Client objects sharing the same node list.
 */

import { Client } from '@hiveio/dhive';
import { HIVE_NODES } from '@/lib/hive-workerbee/nodes';

let dhiveClient: Client | null = null;

/**
 * Return the shared dhive Client, creating it lazily on first call.
 */
export function getDhiveClient(): Client {
  if (!dhiveClient) {
    dhiveClient = new Client(HIVE_NODES);
  }
  return dhiveClient;
}
