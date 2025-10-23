/**
 * Shared Hive API utility for making HTTP calls to Hive blockchain nodes
 * This provides better error handling and fallback options across all modules
 */

/**
 * Make a direct HTTP call to Hive API with automatic failover
 * @param api - The API module (e.g., 'condenser_api', 'rc_api')
 * @param method - The method to call
 * @param params - Parameters to pass to the method
 * @returns Promise with the API response
 */
export async function makeHiveApiCall<T = unknown>(api: string, method: string, params: unknown[] = []): Promise<T> {
  // List of Hive API nodes to try in order
  const apiNodes = [
    'https://api.hive.blog',           // @blocktrades - most reliable
    'https://api.deathwing.me',        // @deathwing - backup node
    'https://api.openhive.network',    // @gtg - established node
    'https://hive-api.arcange.eu'      // @arcange - reliable European node
  ];

  let lastError: Error | null = null;

  for (const nodeUrl of apiNodes) {
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
