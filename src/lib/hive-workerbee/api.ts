/**
 * Shared Hive API utility for making HTTP calls to Hive blockchain nodes
 * This provides better error handling and fallback options across all modules
 * Enhanced with Wax-based type-safe API wrappers
 */

import { 
  getAccountWax, 
  getContentWax, 
  getDiscussionsWax
  // getWaxInstance // Temporarily disabled
} from './wax-helpers';
import { getNodeHealthManager } from './node-health';

/**
 * Make a direct HTTP call to Hive API with automatic failover
 * Enhanced with Wax-based type safety and validation
 * @param api - The API module (e.g., 'condenser_api', 'rc_api')
 * @param method - The method to call
 * @param params - Parameters to pass to the method
 * @returns Promise with the API response
 */
export async function makeHiveApiCall<T = unknown>(api: string, method: string, params: unknown[] = []): Promise<T> {
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
      console.log(`[Hive API] Trying ${nodeUrl} for ${api}.${method}`);
      
      const response = await fetch(nodeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: `${api}.${method}`,
          params: params,
          id: Math.floor(Math.random() * 1000000)
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} from ${nodeUrl}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(`API error from ${nodeUrl}: ${result.error.message}`);
      }
      
      console.log(`[Hive API] Success with ${nodeUrl} for ${api}.${method}`);
      return result.result;
    } catch (error) {
      console.warn(`[Hive API] Failed with ${nodeUrl}:`, error);
      lastError = error as Error;
      // Continue to next node
    }
  }

  // If all nodes failed, throw the last error
  throw new Error(`All Hive API nodes failed. Last error: ${lastError?.message}`);
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
    console.log(`[Wax API] Calling ${method} with params:`, params);
    
    // const wax = await getWaxInstance(); // Temporarily disabled
    // Temporarily disable Wax API calls due to requestInterceptor issues
    throw new Error('Wax API calls temporarily disabled');
  } catch (error) {
    console.error(`[Wax API] Failed for ${method}:`, error);
    
    // Fallback to original HTTP API call
    console.log(`[Wax API] Falling back to HTTP API for ${method}`);
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
    console.log(`[Wax API] Getting account for ${username} using Wax`);
    return await getAccountWax(username);
  } catch (error) {
    console.error(`[Wax API] Failed to get account with Wax, falling back:`, error);
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
    console.log(`[Wax API] Getting content ${author}/${permlink} using Wax`);
    return await getContentWax(author, permlink);
  } catch (error) {
    console.error(`[Wax API] Failed to get content with Wax, falling back:`, error);
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
    console.log(`[Wax API] Getting discussions using ${method} with Wax`);
    return await getDiscussionsWax(method, params);
  } catch (error) {
    console.error(`[Wax API] Failed to get discussions with Wax, falling back:`, error);
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
    console.log('[Hive API] Node health monitoring started');
  } catch (error) {
    console.error('[Hive API] Failed to start node health monitoring:', error);
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
