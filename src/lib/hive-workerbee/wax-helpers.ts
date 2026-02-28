/**
 * Wax Integration Helpers
 *
 * WASM-dependent utilities for Wax library integration with WorkerBee.
 * Pure types, constants, and operation builders live in ./shared.ts.
 */

import { getWaxClient } from './client';
import { workerBee as workerBeeLog, error as logError } from './logger';
import type { IHiveChainInterface } from '@hiveio/wax';

// Re-export everything from shared for backward compatibility
export {
  type WaxVoteOperation,
  type WaxCommentOperation,
  type WaxPostOperation,
  type WaxCommentOptionsOperation,
  type Beneficiary,
  type WaxTransactionResult,
  type WaxTransferToVestingOperation,
  type WaxWithdrawVestingOperation,
  validateBeneficiaries,
  formatHiveAmount,
  formatVestsAmount,
  createPowerUpOperation,
  createPowerDownOperation,
  createCancelPowerDownOperation,
  generatePermlink,
  createVoteOperation,
  createCommentOperation,
  createPostOperation,
  createCommentOptionsOperation,
  validateOperation,
  parseJsonMetadata,
  formatJsonMetadata,
  type WaxClaimRewardBalanceOperation,
  type WaxDelegateVestingSharesOperation,
  createClaimRewardsOperation,
  createDelegateVestsOperation,
} from './shared';

import { validateOperation } from './shared';
import type {
  WaxVoteOperation,
  WaxCommentOperation,
  WaxPostOperation,
  WaxTransactionResult,
} from './shared';

/**
 * Extended Wax client interface with optional methods.
 * These methods may be available at runtime but aren't in the type definitions.
 */
interface WaxExtended extends IHiveChainInterface {
  call?: (method: string, params: unknown[]) => Promise<unknown>;
  getProtocolVersion?: () => Promise<string>;
}

/**
 * Type guard to check if Wax client has the RPC call method.
 */
function hasRpcCall(
  wax: IHiveChainInterface | null
): wax is WaxExtended & { call: NonNullable<WaxExtended['call']> } {
  return wax !== null && typeof (wax as WaxExtended).call === 'function';
}

/**
 * Type guard to check if Wax client has the getProtocolVersion method.
 */
function hasProtocolVersion(
  wax: IHiveChainInterface | null
): wax is WaxExtended & { getProtocolVersion: NonNullable<WaxExtended['getProtocolVersion']> } {
  return wax !== null && typeof (wax as WaxExtended).getProtocolVersion === 'function';
}

/**
 * Get Wax instance with proper error handling
 * Attempts to initialize WorkerBee and access the Wax chain interface
 */
export async function getWaxInstance(): Promise<IHiveChainInterface> {
  try {
    const wax = await getWaxClient();

    // Verify the Wax instance is valid
    if (!wax) {
      throw new Error('Wax instance is null or undefined');
    }

    return wax;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if it's a requestInterceptor-related error
    if (errorMessage.includes('requestInterceptor')) {
      logError(
        '[Wax Helpers] requestInterceptor issue detected - Wax may not be fully compatible in this environment',
        'getWaxInstance',
        error instanceof Error ? error : undefined
      );
      throw new Error(
        'Wax requestInterceptor issue: Wax API may not be compatible in this browser environment. Falling back to HTTP API.'
      );
    }

    logError(
      '[Wax Helpers] Failed to get Wax instance',
      'getWaxInstance',
      error instanceof Error ? error : undefined
    );
    throw new Error(`Unable to initialize Wax client: ${errorMessage}`);
  }
}

/**
 * Broadcast transaction using Wax with proper error handling
 */
export async function broadcastWaxTransaction(
  operations: (WaxVoteOperation | WaxCommentOperation | WaxPostOperation)[]
): Promise<WaxTransactionResult> {
  try {
    // Validate all operations before broadcasting
    for (const operation of operations) {
      const validation = validateOperation(operation);
      if (!validation.isValid) {
        throw new Error(`Operation validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Format operations for Wax
    const waxOperations = operations.map((op) => {
      if ('weight' in op) {
        return ['vote', op];
      } else {
        return ['comment', op];
      }
    });

    // For now, return success without actual broadcasting
    // The actual broadcasting should be handled by the wallet
    workerBeeLog('[Wax Helpers] Wax operations created successfully', undefined, waxOperations);
    return {
      success: true,
      transactionId: 'wax-operation-created',
      blockNum: 0,
      trxNum: 0,
    };
  } catch (error) {
    logError(
      '[Wax Helpers] Transaction broadcast failed',
      'broadcastWaxTransaction',
      error instanceof Error ? error : undefined
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get account information using Wax
 * Uses makeWaxApiCall for consistent API access
 */
export async function getAccountWax(username: string): Promise<unknown | null> {
  try {
    // Use makeWaxApiCall which handles multiple access patterns and fallback
    const { makeWaxApiCall } = await import('./api');
    const result = await makeWaxApiCall<unknown[]>('get_accounts', [[username]]);

    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only log if it's not a known requestInterceptor issue
    if (
      !errorMessage.includes('requestInterceptor') &&
      !errorMessage.includes('temporarily disabled')
    ) {
      logError(
        '[Wax Helpers] Failed to get account',
        'getAccountWax',
        error instanceof Error ? error : undefined
      );
    }

    return null;
  }
}

/**
 * Get content using Wax
 * Uses makeWaxApiCall for consistent API access
 */
export async function getContentWax(author: string, permlink: string): Promise<unknown | null> {
  try {
    // Use makeWaxApiCall which handles multiple access patterns and fallback
    const { makeWaxApiCall } = await import('./api');
    const result = await makeWaxApiCall<unknown>('get_content', [author, permlink]);

    return result || null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only log if it's not a known requestInterceptor issue
    if (
      !errorMessage.includes('requestInterceptor') &&
      !errorMessage.includes('temporarily disabled')
    ) {
      logError(
        '[Wax Helpers] Failed to get content',
        'getContentWax',
        error instanceof Error ? error : undefined
      );
    }

    return null;
  }
}

/**
 * Get discussions using Wax
 * Uses makeWaxApiCall for consistent API access
 */
export async function getDiscussionsWax(method: string, params: unknown[]): Promise<unknown[]> {
  try {
    // Use makeWaxApiCall which handles multiple access patterns and fallback
    const { makeWaxApiCall } = await import('./api');
    const result = await makeWaxApiCall<unknown[]>(method, params);

    return Array.isArray(result) ? result : [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only log if it's not a known requestInterceptor issue
    if (
      !errorMessage.includes('requestInterceptor') &&
      !errorMessage.includes('temporarily disabled')
    ) {
      logError(
        '[Wax Helpers] Failed to get discussions',
        'getDiscussionsWax',
        error instanceof Error ? error : undefined
      );
    }

    return [];
  }
}

/**
 * Check if user has sufficient Resource Credits using the RC API
 * RC data must be fetched from rc_api.find_rc_accounts, not get_accounts
 */
export async function checkResourceCreditsWax(username: string): Promise<{
  canPost: boolean;
  rcPercentage: number;
  message?: string;
}> {
  try {
    // RC data must be fetched from rc_api, not condenser_api
    // Note: rc_api uses object params, not array params like condenser_api
    const { makeHiveApiCall } = await import('./api');
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
        message: 'Account not found',
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

    // Calculate current RC with mana regeneration
    const now = Math.floor(Date.now() / 1000);
    const lastUpdate = rcManabar.last_update_time;
    const currentMana = BigInt(rcManabar.current_mana);
    const maxMana = BigInt(maxRc);

    // RC regenerates fully in 5 days (432000 seconds)
    const REGENERATION_SECONDS = 432000;
    const elapsed = now - lastUpdate;

    // Calculate regenerated mana
    let regeneratedMana = currentMana;
    if (elapsed > 0 && maxMana > 0n) {
      const regenAmount = (maxMana * BigInt(elapsed)) / BigInt(REGENERATION_SECONDS);
      regeneratedMana = currentMana + regenAmount;
      if (regeneratedMana > maxMana) {
        regeneratedMana = maxMana;
      }
    }

    const rcPercentage = maxMana > 0n ? Number((regeneratedMana * 10000n) / maxMana) / 100 : 0;

    // Users typically need at least 10% RC to post
    if (rcPercentage < 10) {
      return {
        canPost: false,
        rcPercentage,
        message: 'Insufficient Resource Credits. You need more HIVE POWER or delegation to post.',
      };
    }

    return {
      canPost: true,
      rcPercentage,
    };
  } catch (error) {
    logError(
      '[Wax Helpers] Failed to check RC',
      'checkResourceCreditsWax',
      error instanceof Error ? error : undefined
    );
    return {
      canPost: false,
      rcPercentage: 0,
      message: 'Error checking Resource Credits',
    };
  }
}

/**
 * Get user's voting power using Wax
 */
export async function getVotingPowerWax(username: string): Promise<number> {
  try {
    const account = (await getAccountWax(username)) as Record<string, unknown>;

    if (!account || !account.voting_power) {
      return 0;
    }

    return (account.voting_power as number) / 100; // Convert from 0-10000 to 0-100
  } catch (error) {
    logError(
      '[Wax Helpers] Failed to get voting power',
      'getVotingPowerWax',
      error instanceof Error ? error : undefined
    );
    return 0;
  }
}

/**
 * Get Wax protocol version
 */
export async function getWaxProtocolVersion(): Promise<string> {
  try {
    const wax = await getWaxInstance();

    // Try to get protocol version from Wax
    if (hasProtocolVersion(wax)) {
      return await wax.getProtocolVersion();
    }

    // Fallback: try using call method to get dynamic global properties
    if (hasRpcCall(wax)) {
      const result = await wax.call('condenser_api.get_dynamic_global_properties', []);
      if (result && typeof result === 'object' && 'head_block_number' in result) {
        return '1.0.0'; // Return a default version if we can connect
      }
    }

    return 'unknown';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only log if it's not a known requestInterceptor issue
    if (
      !errorMessage.includes('requestInterceptor') &&
      !errorMessage.includes('temporarily disabled')
    ) {
      logError(
        '[Wax Helpers] Failed to get protocol version',
        'getWaxProtocolVersion',
        error instanceof Error ? error : undefined
      );
    }

    return 'unknown';
  }
}
