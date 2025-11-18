/**
 * Shared Hive API utility for making HTTP calls to Hive blockchain nodes
 * This provides better error handling and fallback options across all modules
 * Enhanced with Wax-based type-safe API wrappers
 */

import {
  getAccountWax,
  getContentWax,
  getDiscussionsWax,
  // getWaxInstance // Temporarily disabled
} from './wax-helpers';
import { getNodeHealthManager } from './node-health';
import { workerBee as workerBeeLog, info as logInfo, warn as logWarn, error as logError } from './logger';

const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs: number = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make a direct HTTP call to Hive API with automatic failover
 * Enhanced with Wax-based type safety and validation
 * @param api - The API module (e.g., 'condenser_api', 'rc_api')
 * @param method - The method to call
 * @param params - Parameters to pass to the method
 * @returns Promise with the API response
 */
export async function makeHiveApiCall<T = unknown>(api: string, method: string, params: unknown[] = []): Promise<T> {
  // Generate a unique key for request deduplication
  const requestKey = `hive-api:${api}.${method}:${JSON.stringify(params)}`;
  
  // Use deduplication to prevent duplicate concurrent requests
  const { deduplicateRequest } = await import('@/lib/utils/request-deduplication');
  
  return deduplicateRequest(async () => {
    // Get health-based node selection
    const nodeHealthManager = getNodeHealthManager();
    const bestNode = nodeHealthManager.getBestNode();
    
    // Fallback node list for reactive failover
    const apiNodes = [
      bestNode, // Start with healthiest node
      'https://api.hive.blog',           // @blocktrades - most reliable
      'https://api.deathwing.me',        // @deathwing - backup node
      'https://api.openhive.network',    // @gtg - established node
      'https://hive-api.arcange.eu'      // @arcange - reliable European node
    ];

    // Remove duplicates while preserving order
    const uniqueNodes = [...new Set(apiNodes)];

    let lastError: Error | null = null;

    for (const nodeUrl of uniqueNodes) {
      try {
        const start = Date.now();
        workerBeeLog(`Hive API try ${api}.${method}`, undefined, { nodeUrl });

        const response = await fetchWithTimeout(nodeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: `${api}.${method}`,
            params: params,
            id: Math.floor(Math.random() * 1000000)
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} from ${nodeUrl}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(`API error from ${nodeUrl}: ${result.error.message}`);
        }

        const duration = Date.now() - start;
        workerBeeLog(`Hive API success ${api}.${method}`, undefined, { nodeUrl, duration });
        logInfo(`${nodeUrl} responded in ${duration}ms`, `${api}.${method}`, { nodeUrl, duration });
        return result.result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isAbortError = error instanceof Error && error.name === 'AbortError';
        const timeoutMessage = isAbortError || /aborted|timeout/i.test(errorMessage)
          ? `Request to ${nodeUrl} timed out after ${REQUEST_TIMEOUT_MS}ms`
          : errorMessage;

      // Only log as debug during failover (we'll log as warning if all nodes fail)
      workerBeeLog(`Hive API failed for ${api}.${method} using ${nodeUrl}, trying next node: ${timeoutMessage}`);
      lastError = new Error(timeoutMessage);
      // Continue to next node
    }
  }

  // If all nodes failed, log as warning and throw
  logWarn(`All Hive API nodes failed for ${api}.${method}. Last error: ${lastError?.message}`);
  throw new Error(`All Hive API nodes failed. Last error: ${lastError?.message}`);
  }, requestKey);
}

/**
 * Get the list of available Hive API nodes
 * @returns Array of Hive node URLs
 */
export function getHiveApiNodes(): string[] {
  return [
    'https://api.hive.blog',
    'https://api.deathwing.me',
    'https://api.openhive.network',
    'https://hive-api.arcange.eu'
  ];
}

/**
 * Check if a Hive API node is available
 * @param nodeUrl - The node URL to check
 * @returns Promise<boolean> - True if node is available
 */
export async function checkHiveNodeAvailability(nodeUrl: string): Promise<boolean> {
  try {
    const response = await fetch(nodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_dynamic_global_properties',
        params: [],
        id: 1
      })
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wax-enhanced API call with type safety and validation
 * @param method - The API method to call
 * @param params - Parameters to pass to the method
 * @returns Promise with the API response
 */
export async function makeWaxApiCall<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  try {
    workerBeeLog(`Wax API call ${method}`, undefined, params);
    
    // Try to use Wax API with proper error handling
    const { getWaxInstance } = await import('./wax-helpers');
    const wax = await getWaxInstance();
    
    // Try different method access patterns for Wax API
    const waxAny = wax as unknown as Record<string, unknown>;
    
    // Pattern 1: Direct method call (e.g., wax.getAccounts)
    if (typeof waxAny[method] === 'function') {
      const result = await (waxAny[method] as (params: unknown[]) => Promise<T>)(params);
      return result;
    }
    
    // Pattern 2: Using call method with full API path
    if (typeof waxAny.call === 'function') {
      const result = await (waxAny.call as (method: string, params: unknown[]) => Promise<T>)(`condenser_api.${method}`, params);
      return result;
    }
    
    // Pattern 3: Try accessing via api property (some Wax implementations use this)
    if (waxAny.api && typeof (waxAny.api as Record<string, unknown>).call === 'function') {
      const result = await ((waxAny.api as { call: (method: string, params: unknown[]) => Promise<T> }).call)(`condenser_api.${method}`, params);
      return result;
    }
    
    // Pattern 4: Try accessing condenser_api directly
    if (waxAny.condenser_api && typeof (waxAny.condenser_api as Record<string, unknown>)[method] === 'function') {
      const result = await ((waxAny.condenser_api as Record<string, unknown>)[method] as (params: unknown[]) => Promise<T>)(params);
      return result;
    }
    
    throw new Error(`Wax method ${method} not available - tried multiple access patterns`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a requestInterceptor issue
    if (errorMessage.includes('requestInterceptor')) {
      // Silently fall back to HTTP - this is expected in some environments
      logWarn(`Wax API requestInterceptor issue for ${method}, using HTTP fallback`);
      return makeHiveApiCall('condenser_api', method, params);
    }
    
    // Only log as error if it's not a known temporary disable
    if (!errorMessage.includes('temporarily disabled')) {
      logError(`[Wax API] Failed for ${method}: ${errorMessage}`, 'makeWaxApiCall', error instanceof Error ? error : undefined);
    }
    
    // Fallback to original HTTP API call
    logWarn(`Wax API failed for ${method}, falling back to HTTP`);
    return makeHiveApiCall('condenser_api', method, params);
  }
}

/**
 * Get account information using Wax with fallback
 * @param username - Username to get account for
 * @returns Account information
 */
export async function getAccountWaxWithFallback(username: string): Promise<unknown | null> {
  try {
    workerBeeLog(`Wax account for ${username}`);
    return await getAccountWax(username);
  } catch (error) {
    logError('[Wax API] Failed to get account with Wax, falling back', 'getAccountWaxWithFallback', error instanceof Error ? error : undefined);
    return makeHiveApiCall('condenser_api', 'get_accounts', [[username]]);
  }
}

/**
 * Get content using Wax with fallback
 * @param author - Content author
 * @param permlink - Content permlink
 * @returns Content information
 */
export async function getContentWaxWithFallback(author: string, permlink: string): Promise<unknown | null> {
  try {
    workerBeeLog(`Wax content for ${author}/${permlink}`);
    return await getContentWax(author, permlink);
  } catch (error) {
    logError('[Wax API] Failed to get content with Wax, falling back', 'getContentWaxWithFallback', error instanceof Error ? error : undefined);
    return makeHiveApiCall('condenser_api', 'get_content', [author, permlink]);
  }
}

/**
 * Get discussions using Wax with fallback
 * @param method - Discussion method
 * @param params - Method parameters
 * @returns Discussion results
 */
export async function getDiscussionsWaxWithFallback(method: string, params: unknown[]): Promise<unknown[]> {
  try {
    workerBeeLog(`Wax discussions via ${method}`);
    return await getDiscussionsWax(method, params);
  } catch (error) {
    logError('[Wax API] Failed to get discussions with Wax, falling back', 'getDiscussionsWaxWithFallback', error instanceof Error ? error : undefined);
    return makeHiveApiCall('condenser_api', method, params) as Promise<unknown[]>;
  }
}

/**
 * Start node health monitoring
 * Call this during application initialization
 */
export async function startHiveNodeHealthMonitoring(): Promise<void> {
  try {
    const nodeHealthManager = getNodeHealthManager();
    await nodeHealthManager.startProactiveMonitoring();
    logInfo('Node health monitoring started');
  } catch (error) {
    logError('Failed to start node health monitoring', 'startHiveNodeHealthMonitoring', error instanceof Error ? error : undefined);
  }
}

/**
 * Get node health report for monitoring dashboard
 */
export function getHiveNodeHealthReport() {
  const nodeHealthManager = getNodeHealthManager();
  return nodeHealthManager.getHealthReport();
}

/**
 * Validate API response using Wax types
 * @param response - API response to validate
 * @param expectedType - Expected response type
 * @returns Validation result
 */
export function validateApiResponse<T>(response: unknown, expectedType: string): {
  isValid: boolean;
  data?: T;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!response) {
    errors.push('Response is null or undefined');
    return { isValid: false, errors };
  }
  
  if (typeof response !== 'object') {
    errors.push('Response is not an object');
    return { isValid: false, errors };
  }
  
  // Add type-specific validation based on expectedType
  switch (expectedType) {
    case 'account':
      if (!(response as Record<string, unknown>).name) {
        errors.push('Account response missing name field');
      }
      break;
    case 'content':
      if (!(response as Record<string, unknown>).author) {
        errors.push('Content response missing author field');
      }
      if (!(response as Record<string, unknown>).permlink) {
        errors.push('Content response missing permlink field');
      }
      break;
    case 'discussions':
      if (!Array.isArray(response)) {
        errors.push('Discussions response is not an array');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    data: response as T,
    errors
  };
}
