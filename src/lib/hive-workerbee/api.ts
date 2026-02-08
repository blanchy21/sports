/**
 * Shared Hive API utility for making HTTP calls to Hive blockchain nodes
 * This provides better error handling and fallback options across all modules
 * Enhanced with Wax-based type-safe API wrappers
 *
 * Includes:
 * - Rate limiting via token bucket
 * - Circuit breaker integration
 * - Graceful degradation with stale data fallback
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
import { getNodeHealthManager, recordNodeResult } from './node-health';
import {
  workerBee as workerBeeLog,
  info as logInfo,
  warn as logWarn,
  error as logError,
} from './logger';
import { RateLimiter, RateLimitPresets } from '@/lib/utils/rate-limiter';
import type { ApiResult } from '@/lib/utils/result';
// These are imported for re-export at the bottom of this file
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { apiOk, apiErr, isApiOk, isApiErr, toLegacy, mapToApiError } from '@/lib/utils/result';

// Rate limiter for API calls (shared across all calls)
// Use higher limits in test environment to avoid test failures
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
const apiRateLimiter = new RateLimiter({
  ...RateLimitPresets.read,
  // Higher limits for testing
  maxTokens: isTestEnv ? 1000 : RateLimitPresets.read.maxTokens,
  refillRate: isTestEnv ? 100 : RateLimitPresets.read.refillRate,
  name: 'hive-api',
});

// Optimized timeout - 8 seconds provides good balance between reliability and responsiveness
// Previously 15s was causing cumulative delays when nodes were slow/unreachable
const REQUEST_TIMEOUT_MS = 8000; // 8 seconds

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
) {
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
 * Extended Wax client interface for dynamic method access.
 * The Wax library exposes various methods at runtime that aren't in type definitions.
 * This interface allows safe access to these dynamic methods.
 */
interface WaxDynamicClient {
  [method: string]: unknown;
  call?: (method: string, params: unknown[]) => Promise<unknown>;
  api?: {
    call?: (method: string, params: unknown[]) => Promise<unknown>;
  };
  condenser_api?: Record<string, unknown>;
}

/**
 * Cast Wax client to dynamic interface for probing available methods.
 * This is necessary because the Wax library's type definitions don't expose
 * all the methods available at runtime.
 */
function asWaxDynamic(wax: unknown): WaxDynamicClient {
  return wax as WaxDynamicClient;
}

/**
 * Make an API call using WorkerBee's chain (Wax instance)
 * This leverages WorkerBee's built-in node management and failover
 * Falls back to HTTP if WorkerBee chain is unavailable
 * @param method - The method to call (e.g., 'get_content', 'get_accounts')
 * @param params - Parameters to pass to the method
 * @returns Promise with the API response
 */
export async function makeWorkerBeeApiCall<T = unknown>(
  method: string,
  params: unknown[] = []
): Promise<T> {
  // callStartTime can be used for future performance logging

  // Only use WorkerBee on server-side
  if (typeof window !== 'undefined') {
    workerBeeLog(`[WorkerBee API] Client-side detected, using HTTP fallback for ${method}`);
    return makeHiveApiCall('condenser_api', method, params);
  }

  workerBeeLog(`[WorkerBee API] Server-side call: ${method}`, undefined, {
    paramsLength: params.length,
  });

  try {
    const { initializeWorkerBeeClient, getWaxFromWorkerBee } = await import('./client');

    let client;
    try {
      client = await initializeWorkerBeeClient();
    } catch (initError) {
      // If WorkerBee initialization fails, fallback to HTTP
      logWarn(
        `WorkerBee client initialization failed for ${method}, using HTTP fallback`,
        'makeWorkerBeeApiCall',
        initError instanceof Error ? initError : undefined
      );
      return makeHiveApiCall('condenser_api', method, params);
    }

    let wax;
    try {
      wax = getWaxFromWorkerBee(client);
    } catch (waxError) {
      // If getting Wax instance fails, fallback to HTTP
      logWarn(
        `Failed to get Wax instance for ${method}, using HTTP fallback`,
        'makeWorkerBeeApiCall',
        waxError instanceof Error ? waxError : undefined
      );
      return makeHiveApiCall('condenser_api', method, params);
    }

    workerBeeLog(`[WorkerBee API] Calling ${method}`, undefined, { params });

    const waxDynamic = asWaxDynamic(wax);
    const WAX_TIMEOUT_MS = 10000; // 10 seconds timeout

    // Pattern 1: Direct method call (e.g., wax.getContent)
    if (typeof waxDynamic[method] === 'function') {
      const result = await withTimeout(
        (waxDynamic[method] as (params: unknown[]) => Promise<T>)(params),
        WAX_TIMEOUT_MS,
        `WorkerBee API call ${method} timed out after ${WAX_TIMEOUT_MS}ms`
      );
      workerBeeLog(`[WorkerBee API] Success ${method}`);
      return result;
    }

    // Pattern 2: Using call method with full API path
    if (typeof waxDynamic.call === 'function') {
      const result = await withTimeout(
        (waxDynamic.call as (method: string, params: unknown[]) => Promise<T>)(
          `condenser_api.${method}`,
          params
        ),
        WAX_TIMEOUT_MS,
        `WorkerBee API call ${method} timed out after ${WAX_TIMEOUT_MS}ms`
      );
      workerBeeLog(`[WorkerBee API] Success ${method}`);
      return result;
    }

    // Pattern 3: Try accessing via api property
    if (waxDynamic.api && typeof (waxDynamic.api as Record<string, unknown>).call === 'function') {
      const result = await withTimeout(
        (waxDynamic.api as { call: (method: string, params: unknown[]) => Promise<T> }).call(
          `condenser_api.${method}`,
          params
        ),
        WAX_TIMEOUT_MS,
        `WorkerBee API call ${method} timed out after ${WAX_TIMEOUT_MS}ms`
      );
      workerBeeLog(`[WorkerBee API] Success ${method}`);
      return result;
    }

    // Pattern 4: Try accessing condenser_api directly
    if (
      waxDynamic.condenser_api &&
      typeof (waxDynamic.condenser_api as Record<string, unknown>)[method] === 'function'
    ) {
      const result = await withTimeout(
        (
          (waxDynamic.condenser_api as Record<string, unknown>)[method] as (
            params: unknown[]
          ) => Promise<T>
        )(params),
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
    // Don't log as error if it's a known initialization issue
    if (
      !errorMessage.includes('WorkerBee chain not available') &&
      !errorMessage.includes('Failed to initialize')
    ) {
      logWarn(`[WorkerBee API] ${method} failed: ${errorMessage}, using HTTP fallback`);
    }
    return makeHiveApiCall('condenser_api', method, params);
  }
}

/**
 * Make a direct HTTP call to Hive API with automatic failover
 * Enhanced with rate limiting and circuit breaker integration
 * This is kept as a fallback and for client-side usage
 * @param api - The API module (e.g., 'condenser_api', 'rc_api')
 * @param method - The method to call
 * @param params - Parameters to pass to the method (array for condenser_api, object for rc_api)
 * @returns Promise with the API response
 */
export async function makeHiveApiCall<T = unknown>(
  api: string,
  method: string,
  params: unknown[] | Record<string, unknown> = []
): Promise<T> {
  // Generate a unique key for request deduplication
  const requestKey = `hive-api:${api}.${method}:${JSON.stringify(params)}`;

  // Use deduplication to prevent duplicate concurrent requests
  const { deduplicateRequest } = await import('@/lib/utils/request-deduplication');

  return deduplicateRequest(async () => {
    // Apply rate limiting (wait for token)
    const acquired = await apiRateLimiter.acquire(1, { timeout: 5000 });
    if (!acquired) {
      throw new Error('Rate limit exceeded for Hive API calls');
    }

    // Get health-based node selection (now with circuit breaker awareness)
    const nodeHealthManager = getNodeHealthManager();
    const bestNode = nodeHealthManager.getBestNode();

    // Fallback node list for reactive failover — uses shared HIVE_NODES from client.ts
    const apiNodes = [
      bestNode, // Start with healthiest node (from health manager)
      ...HIVE_NODES,
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
            id: Math.floor(Math.random() * 1000000),
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

        // Record success for circuit breaker
        recordNodeResult(nodeUrl, true);

        return result.result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isAbortError = error instanceof Error && error.name === 'AbortError';

        // Categorize different types of errors for better reporting
        let categorizedError: string;
        if (isAbortError || /aborted|timeout/i.test(errorMessage)) {
          categorizedError = `Request to ${nodeUrl} timed out after ${REQUEST_TIMEOUT_MS}ms`;
        } else if (
          /failed to fetch|network error|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION/i.test(errorMessage)
        ) {
          // Network/DNS errors
          categorizedError = `Network error connecting to ${nodeUrl}: ${errorMessage}`;
        } else if (/502|503|504|50[0-9]/.test(errorMessage)) {
          // Server errors
          categorizedError = `Server error from ${nodeUrl}: ${errorMessage}`;
        } else {
          categorizedError = errorMessage;
        }

        // Record failure for circuit breaker
        recordNodeResult(nodeUrl, false, categorizedError);

        // Track attempted nodes for better error reporting
        attemptedNodes.push(nodeUrl);

        // Only log as debug during failover (we'll log as warning if all nodes fail)
        workerBeeLog(
          `Hive API failed for ${api}.${method} using ${nodeUrl}, trying next node: ${categorizedError}`
        );
        lastError = new Error(categorizedError);

        // Add a small delay before trying the next node to avoid overwhelming nodes
        // Only if this isn't the last node
        if (uniqueNodes.indexOf(nodeUrl) < uniqueNodes.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
        }
        // Continue to next node
      }
    }

    // If all nodes failed, log as warning and throw with detailed information
    const errorDetails = {
      method: `${api}.${method}`,
      attemptedNodes: attemptedNodes.length,
      lastError: lastError?.message,
      timeout: `${REQUEST_TIMEOUT_MS}ms`,
    };

    logWarn(
      `All Hive API nodes failed for ${api}.${method}. Attempted ${attemptedNodes.length} nodes. Last error: ${lastError?.message}`,
      undefined,
      errorDetails
    );

    const errorMessage = `All Hive API nodes failed (attempted ${attemptedNodes.length} nodes). This may indicate network issues or all nodes are temporarily unavailable. Last error: ${lastError?.message}`;
    throw new Error(errorMessage);
  }, requestKey);
}

/**
 * Get the list of available Hive API nodes
 * @returns Array of Hive node URLs (verified working nodes only)
 */
import { HIVE_NODES } from './nodes';

/**
 * Get the list of available Hive API nodes (from shared HIVE_NODES in client.ts)
 */
export function getHiveApiNodes(): string[] {
  return [...HIVE_NODES];
}

/**
 * Check if a Hive API node is available
 * @param nodeUrl - The node URL to check
 * @returns Promise<boolean> - True if node is available
 */
export async function checkHiveNodeAvailability(nodeUrl: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      nodeUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_dynamic_global_properties',
          params: [],
          id: 1,
        }),
      },
      5000
    ); // 5 second timeout for health checks (should be faster than normal requests)

    if (!response.ok) {
      return false;
    }

    // Verify the response is valid JSON and contains expected data
    const result = await response.json();
    return result && result.result && !result.error;
  } catch (error) {
    // Log health check failures for debugging node connectivity issues
    logWarn(`Hive node health check failed: ${nodeUrl}`, 'checkHiveNodeAvailability', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Wrap a promise with a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    }),
  ]);
}

/**
 * Make a Wax API call (legacy function - now uses WorkerBee internally)
 * @deprecated Use makeWorkerBeeApiCall() instead for better WorkerBee integration
 * This function is kept for backward compatibility
 */
export async function makeWaxApiCall<T = unknown>(
  method: string,
  params: unknown[] = []
): Promise<T> {
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
    logError(
      '[Wax API] Failed to get account with Wax, falling back',
      'getAccountWaxWithFallback',
      error instanceof Error ? error : undefined
    );
    return makeHiveApiCall('condenser_api', 'get_accounts', [[username]]);
  }
}

/**
 * Get content using Wax with fallback
 * @param author - Content author
 * @param permlink - Content permlink
 * @returns Content information
 */
export async function getContentWaxWithFallback(
  author: string,
  permlink: string
): Promise<unknown | null> {
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
    logError(
      '[Wax API] Failed to get content with Wax, falling back',
      'getContentWaxWithFallback',
      error instanceof Error ? error : undefined
    );
    return makeHiveApiCall('condenser_api', 'get_content', [author, permlink]);
  }
}

/**
 * Get discussions using Wax with fallback
 * @param method - Discussion method
 * @param params - Method parameters
 * @returns Discussion results
 */
export async function getDiscussionsWaxWithFallback(
  method: string,
  params: unknown[]
): Promise<unknown[]> {
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
    logError(
      '[Wax API] Failed to get discussions with Wax, falling back',
      'getDiscussionsWaxWithFallback',
      error instanceof Error ? error : undefined
    );
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
    logError(
      'Failed to start node health monitoring',
      'startHiveNodeHealthMonitoring',
      error instanceof Error ? error : undefined
    );
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
export function validateApiResponse<T>(
  response: unknown,
  expectedType: string
): {
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
    errors,
  };
}

/**
 * Make a Hive API call with graceful degradation support
 * Returns ApiResult with stale data fallback on failure
 * @param api - The API module (e.g., 'condenser_api', 'rc_api')
 * @param method - The method to call
 * @param params - Parameters to pass to the method
 * @param options - Degradation options
 * @returns ApiResult with data or stale fallback
 */
export async function makeHiveApiCallWithFallback<T = unknown>(
  api: string,
  method: string,
  params: unknown[] = [],
  options?: {
    cacheTTL?: number;
    maxStaleAge?: number;
    tags?: string[];
  }
): Promise<ApiResult<T>> {
  const { getOrFetchWithFallback } = await import('./graceful-degradation');

  const cacheKey = `hive:${api}.${method}:${JSON.stringify(params)}`;

  return getOrFetchWithFallback<T>(cacheKey, () => makeHiveApiCall<T>(api, method, params), {
    cacheTTL: options?.cacheTTL ?? 5 * 60 * 1000, // 5 minutes default
    maxStaleAge: options?.maxStaleAge ?? 5 * 60 * 1000, // 5 minutes default
    tags: options?.tags,
  });
}

/**
 * Get rate limiter stats for monitoring
 */
export function getApiRateLimiterStats() {
  return apiRateLimiter.getStats();
}

/**
 * Check if API is rate limited
 */
export function isApiRateLimited(): boolean {
  return apiRateLimiter.isThrottled();
}

// Re-export types for consumers
export type { ApiResult } from '@/lib/utils/result';
export { apiOk, apiErr, isApiOk, isApiErr, toLegacy } from '@/lib/utils/result';
