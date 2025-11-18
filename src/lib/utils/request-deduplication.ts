/**
 * Request Deduplication Utility
 * 
 * Prevents duplicate API calls by tracking in-flight requests
 * and sharing the same promise for concurrent identical requests.
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// Global map to track in-flight requests
const pendingRequests = new Map<string, PendingRequest<unknown>>();

// Configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds - cleanup stale requests
const CLEANUP_INTERVAL = 60000; // 1 minute - cleanup interval

/**
 * Cleanup stale requests periodically
 */
function cleanupStaleRequests(): void {
  const now = Date.now();
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > REQUEST_TIMEOUT) {
      pendingRequests.delete(key);
    }
  }
}

// Start cleanup interval
if (typeof window !== 'undefined') {
  setInterval(cleanupStaleRequests, CLEANUP_INTERVAL);
}

/**
 * Generate a unique key for a request
 */
function generateRequestKey(
  url: string,
  method: string = 'GET',
  body?: unknown,
  headers?: Record<string, string>
): string {
  const parts = [
    method.toUpperCase(),
    url,
    body ? JSON.stringify(body) : '',
    headers ? JSON.stringify(headers) : ''
  ];
  return parts.join('|');
}

/**
 * Deduplicate API requests
 * 
 * If the same request is made multiple times concurrently,
 * this will return the same promise for all callers.
 * 
 * @param requestFn - Function that makes the API request
 * @param key - Unique key for the request (optional, will be generated if not provided)
 * @returns Promise that resolves with the request result
 */
export async function deduplicateRequest<T>(
  requestFn: () => Promise<T>,
  key?: string
): Promise<T> {
  // Generate key if not provided
  const requestKey = key || `request-${Date.now()}-${Math.random()}`;
  
  // Check if there's already a pending request
  const existingRequest = pendingRequests.get(requestKey) as PendingRequest<T> | undefined;
  
  if (existingRequest) {
    // Return the existing promise
    return existingRequest.promise;
  }
  
  // Create new request
  const promise = requestFn()
    .then((result) => {
      // Remove from pending requests on success
      pendingRequests.delete(requestKey);
      return result;
    })
    .catch((error) => {
      // Remove from pending requests on error
      pendingRequests.delete(requestKey);
      throw error;
    });
  
  // Store the pending request
  pendingRequests.set(requestKey, {
    promise: promise as Promise<unknown>,
    timestamp: Date.now()
  });
  
  return promise;
}

/**
 * Deduplicate fetch requests by URL and options
 */
export async function deduplicateFetch<T>(
  url: string,
  options?: RequestInit,
  transform?: (response: Response) => Promise<T>
): Promise<T> {
  const method = options?.method || 'GET';
  const body = options?.body;
  const headers = options?.headers as Record<string, string> | undefined;
  
  const key = generateRequestKey(url, method, body, headers);
  
  return deduplicateRequest(async () => {
    const response = await fetch(url, options);
    
    if (transform) {
      return transform(response);
    }
    
    // Default: return JSON
    if (response.ok) {
      return response.json() as Promise<T>;
    }
    
    throw new Error(`HTTP error! status: ${response.status}`);
  }, key);
}

/**
 * Clear all pending requests (useful for testing or cleanup)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * Get count of pending requests (useful for monitoring)
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

/**
 * Get all pending request keys (useful for debugging)
 */
export function getPendingRequestKeys(): string[] {
  return Array.from(pendingRequests.keys());
}

