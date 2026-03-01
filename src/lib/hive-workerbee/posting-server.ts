/**
 * Server-only posting functions.
 *
 * These functions depend on WASM-contaminated modules (api, wax-helpers)
 * and must NOT be imported in client components.
 *
 * Client-safe types, validation, and publish functions remain in ./posting.ts.
 */

import { SPORTS_ARENA_CONFIG } from './shared';
import { makeHiveApiCall } from './api';
import { checkResourceCreditsWax } from './wax-helpers';
import { workerBee as workerBeeLog, warn as logWarn, error as logError } from './logger';

import type { BroadcastFn, HiveOperation } from '@/lib/hive/broadcast-client';
import type { PublishResult } from './posting';

/**
 * Check if user has enough Resource Credits to post.
 * Server-only — uses WASM RC check with API fallback.
 */
export async function canUserPost(username: string): Promise<{
  canPost: boolean;
  rcPercentage: number;
  message?: string;
}> {
  try {
    workerBeeLog(`canUserPost check RC for ${username} via Wax`);

    const rcCheck = await checkResourceCreditsWax(username);

    if (!rcCheck.canPost) {
      logWarn(`canUserPost insufficient RC for ${username}: ${rcCheck.message}`);
      return rcCheck;
    }

    workerBeeLog(`canUserPost sufficient RC for ${username}`, undefined, {
      rcPercentage: rcCheck.rcPercentage,
    });
    return rcCheck;
  } catch (error) {
    logError('Error checking RC with Wax', undefined, error instanceof Error ? error : undefined);

    // Fallback to direct RC API call if Wax fails
    try {
      logWarn('canUserPost falling back to direct RC API call');
      const rcResult = (await makeHiveApiCall('rc_api', 'find_rc_accounts', {
        accounts: [username],
      })) as {
        rc_accounts?: Array<{
          account: string;
          rc_manabar: {
            current_mana: string;
            last_update_time: number;
          };
          max_rc: string;
        }>;
      };

      const rcAccounts = rcResult?.rc_accounts;
      if (!rcAccounts || rcAccounts.length === 0) {
        return {
          canPost: false,
          rcPercentage: 0,
          message: 'Unable to fetch account RC information',
        };
      }

      const rcAccount = rcAccounts[0];
      const rcManabar = rcAccount.rc_manabar;
      const maxRc = rcAccount.max_rc;

      if (!rcManabar || !maxRc) {
        return {
          canPost: false,
          rcPercentage: 0,
          message: 'Resource Credits information not available',
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const lastUpdate = rcManabar.last_update_time;
      const currentMana = BigInt(rcManabar.current_mana);
      const maxMana = BigInt(maxRc);

      const REGENERATION_SECONDS = 432000;
      const elapsed = now - lastUpdate;

      let regeneratedMana = currentMana;
      if (elapsed > 0 && maxMana > 0n) {
        const regenAmount = (maxMana * BigInt(elapsed)) / BigInt(REGENERATION_SECONDS);
        regeneratedMana = currentMana + regenAmount;
        if (regeneratedMana > maxMana) {
          regeneratedMana = maxMana;
        }
      }

      const rcPercentage = maxMana > 0n ? Number((regeneratedMana * 10000n) / maxMana) / 100 : 0;

      if (rcPercentage < 10) {
        return {
          canPost: false,
          rcPercentage,
          message: 'Insufficient Resource Credits. You need more HIVE POWER or delegation to post.',
        };
      }

      return { canPost: true, rcPercentage };
    } catch (fallbackError) {
      logError(
        'Error in fallback RC check',
        'canUserPost',
        fallbackError instanceof Error ? fallbackError : undefined
      );
      return {
        canPost: false,
        rcPercentage: 0,
        message: 'Network error checking posting eligibility. Please try again.',
      };
    }
  }
}

function parseJsonMetadata(jsonMetadata: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonMetadata || '{}');
  } catch {
    return {};
  }
}

/**
 * Update an existing post.
 * Server-only — fetches existing post via Hive API.
 */
export async function updatePost(
  updateData: {
    author: string;
    permlink: string;
    title?: string;
    body?: string;
    jsonMetadata?: string;
  },
  broadcastFn: BroadcastFn
): Promise<PublishResult> {
  try {
    const existingPost = await makeHiveApiCall('condenser_api', 'get_content', [
      updateData.author,
      updateData.permlink,
    ]);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    const postAge = Date.now() - new Date((existingPost as { created: string }).created).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (postAge > sevenDays) {
      throw new Error('Post cannot be updated after 7 days');
    }

    const existingMetadata = parseJsonMetadata(
      (existingPost as { json_metadata: string }).json_metadata
    );
    const updateMetadata = updateData.jsonMetadata
      ? parseJsonMetadata(updateData.jsonMetadata)
      : {};
    const mergedMetadata = { ...existingMetadata, ...updateMetadata };

    const operation = {
      parent_author: (existingPost as { parent_author: string }).parent_author,
      parent_permlink: (existingPost as { parent_permlink: string }).parent_permlink,
      author: updateData.author,
      permlink: updateData.permlink,
      title: updateData.title || (existingPost as { title: string }).title,
      body: updateData.body || (existingPost as { body: string }).body,
      json_metadata: JSON.stringify(mergedMetadata),
    };

    const operations: HiveOperation[] = [['comment', operation]];
    const result = await broadcastFn(operations, 'posting');

    if (!result.success) {
      throw new Error(`Transaction failed: ${result.error || 'Unknown error'}`);
    }

    return {
      success: true,
      transactionId: result.transactionId || 'unknown',
      author: updateData.author,
      permlink: updateData.permlink,
      url: `https://hive.blog/@${updateData.author}/${updateData.permlink}`,
    };
  } catch (error) {
    logError('Error updating post', undefined, error instanceof Error ? error : undefined);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a post. Tries `delete_comment` first, then soft-delete fallback.
 * Server-only — soft-delete fallback calls updatePost which uses Hive API.
 */
export async function deletePost(
  deleteData: {
    author: string;
    permlink: string;
  },
  broadcastFn: BroadcastFn
): Promise<PublishResult> {
  // Try hard delete first
  try {
    const hardResult = await broadcastFn(
      [['delete_comment', { author: deleteData.author, permlink: deleteData.permlink }]],
      'posting'
    );

    if (hardResult.success) {
      workerBeeLog('deletePost: hard delete succeeded', undefined, deleteData);
      return {
        success: true,
        transactionId: hardResult.transactionId,
        hardDeleted: true,
      };
    }

    workerBeeLog('deletePost: hard delete failed, falling back to soft delete', undefined, {
      error: hardResult.error,
    });
  } catch (error) {
    workerBeeLog('deletePost: hard delete threw, falling back to soft delete', undefined, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Soft delete fallback: overwrite body + mark as deleted
  try {
    const softResult = await updatePost(
      {
        author: deleteData.author,
        permlink: deleteData.permlink,
        body: '',
        jsonMetadata: JSON.stringify({
          app: `${SPORTS_ARENA_CONFIG.APP_NAME}/${SPORTS_ARENA_CONFIG.APP_VERSION}`,
          tags: ['deleted', 'sportsblock'],
        }),
      },
      broadcastFn
    );

    return { ...softResult, hardDeleted: false };
  } catch (error) {
    logError('Error deleting post', undefined, error instanceof Error ? error : undefined);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
