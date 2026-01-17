/**
 * Utility functions for API retry logic with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  /** Jitter factor (0-1) to randomize delays and prevent thundering herd. Default 0.3 (±30%) */
  jitter?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504], // Rate limit and server errors
  jitter: 0.3, // ±30% randomization to prevent thundering herd
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 * Jitter helps prevent "thundering herd" where all clients retry simultaneously
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const baseDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  const cappedDelay = Math.min(baseDelay, options.maxDelay);

  // Apply jitter: randomize the delay by ±jitter factor
  // e.g., with jitter=0.3 and delay=1000ms, result is 700-1300ms
  if (options.jitter > 0) {
    const jitterRange = cappedDelay * options.jitter;
    const jitterOffset = (Math.random() * 2 - 1) * jitterRange; // Random between -jitterRange and +jitterRange
    return Math.max(0, Math.round(cappedDelay + jitterOffset));
  }

  return cappedDelay;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param options - Retry configuration options
 * @returns Promise with the result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const errorStatus = (error as { status?: number }).status;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = 
        (errorStatus && opts.retryableStatuses.includes(errorStatus)) ||
        errorMessage.includes('429') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNRESET');

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === opts.maxRetries || !isRetryable) {
        throw error;
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(attempt, opts);
      console.log(`[retryWithBackoff] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry a fetch request with exponential backoff
 * @param url - URL to fetch
 * @param init - Fetch options
 * @param options - Retry configuration options
 * @returns Promise with the response
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init);
    
    // Check if response status is retryable
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (!response.ok && opts.retryableStatuses.includes(response.status)) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    
    return response;
  }, options);
}

