/**
 * Shared Hive API utility for making HTTP calls to Hive blockchain nodes
 * This provides better error handling and fallback options across all modules
 * Enhanced with Wax-based type-safe API wrappers
 */

// Wax helpers are only available server-side
// Import dynamically to avoid client-side bundling issues
let waxHelpers: typeof import('./wax-helpers') | null = null;
async function getWaxHelpers() {
  if (typeof window !== 'undefined') {
    // Client-side: return null to skip Wax usage
    return null;
  }
  if (!waxHelpers) {
    waxHelpers = await import('./wax-helpers');
  }
  return waxHelpers;
}
import { getNodeHealthManager } from './node-health';
import { workerBee as workerBeeLog, info as logInfo, warn as logWarn, error as logError } from './logger';

// Increased timeout for better reliability on slow networks
const REQUEST_TIMEOUT_MS = 15000; // 15 seconds

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
 * Make an API call using WorkerBee's chain (Wax instance)
 * This leverages WorkerBee's built-in node management and failover
 * Falls back to HTTP if WorkerBee chain is unavailable
 * @param method - The method to call (e.g., 'get_content', 'get_accounts')
 * @param params - Parameters to pass to the method
 * @returns Promise with the API response
 */
export async function makeWorkerBeeApiCall<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  // Only use WorkerBee on server-side
  if (typeof window !== 'undefined') {
    // Client-side: fallback to HTTP
    return makeHiveApiCall('condenser_api', method, params);
  }

  try {
    const { initializeWorkerBeeClient, getWaxFromWorkerBee } = await import('./client');
    const client = await initializeWorkerBeeClient();
    const wax = getWaxFromWorkerBee(client);
    
    workerBeeLog(`[WorkerBee API] Calling ${method}`, undefined, { params });
    
    const waxAny = wax as unknown as Record<string, unknown>;
    const WAX_TIMEOUT_MS = 10000; // 10 seconds timeout
    
    // Pattern 1: Direct method call (e.g., wax.getContent)
    if (typeof waxAny[method] === 'function') {
      const result = await withTimeout(
        (waxAny[method] as (params: unknown[]) => Promise<T>)(params),
        WAX_TIMEOUT_MS,
        `WorkerBee API call ${method} timed out after ${WAX_TIMEOUT_MS}ms`
      );
      workerBeeLog(`[WorkerBee API] Success ${method}`);
      return result;
    }
    
    // Pattern 2: Using call method with full API path
    if (typeof waxAny.call === 'function') {
      const result = await withTimeout(
        (waxAny.call as (method: string, params: unknown[]) => Promise<T>)(`condenser_api.${method}`, params),
        WAX_TIMEOUT_MS,
        `WorkerBee API call ${method} timed out after ${WAX_TIMEOUT_MS}ms`
      );
      workerBeeLog(`[WorkerBee API] Success ${method}`);
      return result;
    }
    
    // Pattern 3: Try accessing via api property
    if (waxAny.api && typeof (waxAny.api as Record<string, unknown>).call === 'function') {
      const result = await withTimeout(
        ((waxAny.api as { call: (method: string, params: unknown[]) => Promise<T> }).call)(`condenser_api.${method}`, params),
        WAX_TIMEOUT_MS,
        `WorkerBee API call ${method} timed out after ${WAX_TIMEOUT_MS}ms`
      );
      workerBeeLog(`[WorkerBee API] Success ${method}`);
      return result;
    }
    
    // Pattern 4: Try accessing condenser_api directly
    if (waxAny.condenser_api && typeof (waxAny.condenser_api as Record<string, unknown>)[method] === 'function') {
      const result = await withTimeout(
        ((waxAny.condenser_api as Record<string, unknown>)[method] as (params: unknown[]) => Promise<T>)(params),
        WAX_TIMEOUT_MS,
        `WorkerBee API call ${method} timed out after ${WAX_TIMEOUT_MS}ms`
      );
      workerBeeLog(`[WorkerBee API] Success ${method}`);
      return result;
    }
    
    throw new Error(`WorkerBee method ${method} not available - tried multiple access patterns`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for timeout or requestInterceptor issues
    const isTimeoutError = 
      errorMessage.includes('timed out') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('Request timed out');
    
    const isRequestInterceptorIssue = errorMessage.includes('requestInterceptor');
    
    // For known issues, silently fall back to HTTP
    if (isTimeoutError || isRequestInterceptorIssue) {
      logWarn(`[WorkerBee API] ${method} failed (${errorMessage}), using HTTP fallback`);
      return makeHiveApiCall('condenser_api', method, params);
    }
    
    // For other errors, log and fallback
    logWarn(`[WorkerBee API] ${method} failed: ${errorMessage}, using HTTP fallback`);
    return makeHiveApiCall('condenser_api', method, params);
  }
}

/**
 * Make a direct HTTP call to Hive API with automatic failover
 * Enhanced with Wax-based type safety and validation
 * This is kept as a fallback and for client-side usage
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
    // Using verified reliable nodes only
    // Note: hive-api.arcange.eu removed due to consistent timeout issues
    const apiNodes = [
      bestNode, // Start with healthiest node
      'https://api.hive.blog',           // @blocktrades - most reliable
      'https://api.openhive.network',    // @gtg - established node
      'https://api.deathwing.me',        // @deathwing - backup node
      'https://api.c0ff33a.uk',          // @c0ff33a - backup node
      'https://hive-api.arcange.eu'       // @arcange - last resort (known to timeout frequently)
    ];

    // Remove duplicates while preserving order
    const uniqueNodes = [...new Set(apiNodes)];

    let lastError: Error | null = null;
    const attemptedNodes: string[] = [];

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
        
        // Categorize different types of errors for better reporting
        let categorizedError: string;
        if (isAbortError || /aborted|timeout/i.test(errorMessage)) {
          categorizedError = `Request to ${nodeUrl} timed out after ${REQUEST_TIMEOUT_MS}ms`;
        } else if (/failed to fetch|network error|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION/i.test(errorMessage)) {
          // Network/DNS errors
          categorizedError = `Network error connecting to ${nodeUrl}: ${errorMessage}`;
        } else if (/502|503|504|50[0-9]/.test(errorMessage)) {
          // Server errors
          categorizedError = `Server error from ${nodeUrl}: ${errorMessage}`;
        } else {
          categorizedError = errorMessage;
        }

        // Track attempted nodes for better error reporting
        attemptedNodes.push(nodeUrl);

        // Only log as debug during failover (we'll log as warning if all nodes fail)
        workerBeeLog(`Hive API failed for ${api}.${method} using ${nodeUrl}, trying next node: ${categorizedError}`);
        lastError = new Error(categorizedError);
        
        // Add a small delay before trying the next node to avoid overwhelming nodes
        // Only if this isn't the last node
        if (uniqueNodes.indexOf(nodeUrl) < uniqueNodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        }
        // Continue to next node
      }
    }

    // If all nodes failed, log as warning and throw with detailed information
    const errorDetails = {
      method: `${api}.${method}`,
      attemptedNodes: attemptedNodes.length,
      lastError: lastError?.message,
      timeout: `${REQUEST_TIMEOUT_MS}ms`
    };
    
    logWarn(`All Hive API nodes failed for ${api}.${method}. Attempted ${attemptedNodes.length} nodes. Last error: ${lastError?.message}`, undefined, errorDetails);
    
    const errorMessage = `All Hive API nodes failed (attempted ${attemptedNodes.length} nodes). This may indicate network issues or all nodes are temporarily unavailable. Last error: ${lastError?.message}`;
    throw new Error(errorMessage);
  }, requestKey);
}

/**
 * Get the list of available Hive API nodes
 * @returns Array of Hive node URLs (verified working nodes only)
 */
export function getHiveApiNodes(): string[] {
  return [
    'https://api.hive.blog',           // @blocktrades - most reliable
    'https://api.openhive.network',    // @gtg - established node
    'https://api.deathwing.me',        // @deathwing - backup node
    'https://api.c0ff33a.uk',          // @c0ff33a - backup node
    'https://hive-api.arcange.eu'      // @arcange - last resort (known to timeout frequently)
  ];
}

/**
 * Check if a Hive API node is available
 * @param nodeUrl - The node URL to check
 * @returns Promise<boolean> - True if node is available
 */
export async function checkHiveNodeAvailability(nodeUrl: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(nodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_dynamic_global_properties',
        params: [],
        id: 1
      }),
    }, 10000); // 10 second timeout for health checks
    
    if (!response.ok) {
      return false;
    }
    
    // Verify the response is valid JSON and contains expected data
    const result = await response.json();
    return result && result.result && !result.error;
  } catch {
    return false;
  }
}

/**
 * Wrap a promise with a timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    })
  ]);
}

/**
 * Make a Wax API call (legacy function - now uses WorkerBee internally)
 * @deprecated Use makeWorkerBeeApiCall() instead for better WorkerBee integration
 * This function is kept for backward compatibility
 */
export async function makeWaxApiCall<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  // Use the new WorkerBee API call function
  return makeWorkerBeeApiCall<T>(method, params);
}

/**
 * Get account information using Wax with fallback
 * @param username - Username to get account for
 * @returns Account information
 */
export async function getAccountWaxWithFallback(username: string): Promise<unknown | null> {
  try {
    // Only use Wax on server-side
    if (typeof window !== 'undefined') {
      return makeHiveApiCall('condenser_api', 'get_accounts', [[username]]);
    }
    workerBeeLog(`Wax account for ${username}`);
    const helpers = await getWaxHelpers();
    if (!helpers) {
      return makeHiveApiCall('condenser_api', 'get_accounts', [[username]]);
    }
    return await helpers.getAccountWax(username);
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
    // Only use Wax on server-side
    if (typeof window !== 'undefined') {
      return makeHiveApiCall('condenser_api', 'get_content', [author, permlink]);
    }
    workerBeeLog(`Wax content for ${author}/${permlink}`);
    const helpers = await getWaxHelpers();
    if (!helpers) {
      return makeHiveApiCall('condenser_api', 'get_content', [author, permlink]);
    }
    return await helpers.getContentWax(author, permlink);
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
    // Only use Wax on server-side
    if (typeof window !== 'undefined') {
      return makeHiveApiCall('condenser_api', method, params) as Promise<unknown[]>;
    }
    workerBeeLog(`Wax discussions via ${method}`);
    const helpers = await getWaxHelpers();
    if (!helpers) {
      return makeHiveApiCall('condenser_api', method, params) as Promise<unknown[]>;
    }
    return await helpers.getDiscussionsWax(method, params);
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
