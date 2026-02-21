/**
 * Authenticated Fetch Utility
 *
 * Wrapper around fetch that automatically adds authentication headers.
 * Use this for API calls that require user authentication.
 */

type AuthInfo = {
  userId: string;
  username: string;
} | null;

// Module-level auth info cache (set by AuthContext)
let currentAuthInfo: AuthInfo = null;

/**
 * Set the current authenticated user info
 * Called by AuthContext when auth state changes
 */
export function setAuthInfo(authInfo: AuthInfo): void {
  currentAuthInfo = authInfo;
}

/**
 * Get the current authenticated user info
 */
export function getAuthInfo(): AuthInfo {
  return currentAuthInfo;
}

/**
 * Clear the current authenticated user info
 * Called on logout
 */
export function clearAuthInfo(): void {
  currentAuthInfo = null;
}

/**
 * Make an authenticated fetch request
 *
 * Automatically adds:
 * - credentials: 'include' so the httpOnly session cookie is sent
 * - Content-Type: application/json for POST/PUT/PATCH requests
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  // Add Content-Type for methods that typically have a body
  const method = options.method?.toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
}

/**
 * Make an authenticated POST request with JSON body
 *
 * @param url - The URL to post to
 * @param data - The data to send (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Fetch response
 */
export async function authenticatedPost<T = unknown>(
  url: string,
  data: T,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<Response> {
  return authenticatedFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Make an authenticated PATCH request with JSON body
 *
 * @param url - The URL to patch
 * @param data - The data to send (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Fetch response
 */
export async function authenticatedPatch<T = unknown>(
  url: string,
  data: T,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<Response> {
  return authenticatedFetch(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Make an authenticated DELETE request
 *
 * @param url - The URL to delete
 * @param data - Optional data to send (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Fetch response
 */
export async function authenticatedDelete<T = unknown>(
  url: string,
  data?: T,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<Response> {
  return authenticatedFetch(url, {
    ...options,
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined,
  });
}
