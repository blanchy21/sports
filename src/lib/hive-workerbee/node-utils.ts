/**
 * Shared node utilities used by both api.ts and node-health.ts.
 *
 * Extracted to break the circular dependency:
 *   api.ts  -->  node-health.ts  (getNodeHealthManager, recordNodeResult)
 *   node-health.ts  -->  api.ts  (checkHiveNodeAvailability, getHiveApiNodes)
 *
 * Now both files import from this leaf module instead.
 */

import { HIVE_NODES } from './nodes';
import { warn as logWarn } from './logger';

/**
 * Get the list of available Hive API nodes.
 */
export function getHiveApiNodes(): string[] {
  return [...HIVE_NODES];
}

/**
 * Check if a Hive API node is available by hitting get_dynamic_global_properties.
 * Uses a 5-second timeout (shorter than normal requests) for fast health checks.
 */
export async function checkHiveNodeAvailability(nodeUrl: string): Promise<boolean> {
  const HEALTH_CHECK_TIMEOUT_MS = 5000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(nodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_dynamic_global_properties',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result && result.result && !result.error;
  } catch (error) {
    logWarn(`Hive node health check failed: ${nodeUrl}`, 'checkHiveNodeAvailability', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
