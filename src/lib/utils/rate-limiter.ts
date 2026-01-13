/**
 * Token Bucket Rate Limiter
 *
 * Implements the token bucket algorithm for rate limiting.
 * Tokens are added at a constant rate and consumed by requests.
 * This smooths out traffic spikes and prevents API abuse.
 */

/**
 * Token bucket configuration
 */
export interface TokenBucketConfig {
  /** Maximum number of tokens in the bucket (default: 100) */
  maxTokens: number;
  /** Tokens added per second (default: 10) */
  refillRate: number;
  /** Initial tokens (default: maxTokens) */
  initialTokens?: number;
  /** Name for logging (optional) */
  name?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TokenBucketConfig = {
  maxTokens: 100,
  refillRate: 10,
};

/**
 * Rate limiter statistics
 */
export interface RateLimiterStats {
  availableTokens: number;
  maxTokens: number;
  refillRate: number;
  queueLength: number;
  totalAcquired: number;
  totalRejected: number;
  lastRefillTime: number;
}

/**
 * Queued request waiting for tokens
 */
interface QueuedRequest {
  tokens: number;
  priority: number;
  resolve: (acquired: boolean) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout | null;
  timestamp: number;
}

/**
 * Token Bucket implementation
 */
export class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  private config: TokenBucketConfig;

  constructor(config: Partial<TokenBucketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tokens = this.config.initialTokens ?? this.config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Try to consume tokens (non-blocking)
   * Returns true if tokens were consumed, false otherwise
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Get current available tokens
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time in ms until enough tokens are available
   */
  getWaitTime(tokens: number = 1): number {
    this.refill();

    if (this.tokens >= tokens) {
      return 0;
    }

    const tokensNeeded = tokens - this.tokens;
    return Math.ceil((tokensNeeded / this.config.refillRate) * 1000);
  }

  /**
   * Check if tokens are available without consuming
   */
  hasTokens(tokens: number = 1): boolean {
    this.refill();
    return this.tokens >= tokens;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    if (elapsed > 0) {
      const tokensToAdd = (elapsed / 1000) * this.config.refillRate;
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  /**
   * Get bucket stats
   */
  getStats(): { tokens: number; maxTokens: number; refillRate: number } {
    this.refill();
    return {
      tokens: this.tokens,
      maxTokens: this.config.maxTokens,
      refillRate: this.config.refillRate,
    };
  }
}

/**
 * Rate Limiter with queuing support
 *
 * Provides both blocking (wait for tokens) and non-blocking (try acquire) modes.
 * Supports priority queuing for critical requests.
 */
export class RateLimiter {
  private bucket: TokenBucket;
  private queue: QueuedRequest[] = [];
  private processing: boolean = false;
  private totalAcquired: number = 0;
  private totalRejected: number = 0;
  private config: TokenBucketConfig;

  constructor(config: Partial<TokenBucketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bucket = new TokenBucket(this.config);
  }

  /**
   * Acquire tokens, waiting if necessary
   * @param tokens Number of tokens to acquire (default: 1)
   * @param options Acquisition options
   * @returns Promise<boolean> - true if acquired, false if timed out
   */
  async acquire(
    tokens: number = 1,
    options: { timeout?: number; priority?: number } = {}
  ): Promise<boolean> {
    const { timeout = 30000, priority = 0 } = options;

    // Try immediate acquisition
    if (this.bucket.tryConsume(tokens)) {
      this.totalAcquired++;
      return true;
    }

    // Queue the request
    return new Promise<boolean>((resolve, reject) => {
      const request: QueuedRequest = {
        tokens,
        priority,
        resolve: (acquired: boolean) => {
          if (acquired) {
            this.totalAcquired++;
          } else {
            this.totalRejected++;
          }
          resolve(acquired);
        },
        reject,
        timeoutId: null,
        timestamp: Date.now(),
      };

      // Set timeout
      if (timeout > 0) {
        request.timeoutId = setTimeout(() => {
          this.removeFromQueue(request);
          this.totalRejected++;
          resolve(false);
        }, timeout);
      }

      // Add to queue (sorted by priority, then timestamp)
      this.insertByPriority(request);

      // Start processing if not already
      this.processQueue();
    });
  }

  /**
   * Try to acquire tokens immediately (non-blocking)
   * @returns true if acquired, false if not enough tokens
   */
  tryAcquire(tokens: number = 1): boolean {
    if (this.bucket.tryConsume(tokens)) {
      this.totalAcquired++;
      return true;
    }
    this.totalRejected++;
    return false;
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: { tokens?: number; timeout?: number; priority?: number } = {}
  ): Promise<T> {
    const { tokens = 1, timeout = 30000, priority = 0 } = options;

    const acquired = await this.acquire(tokens, { timeout, priority });

    if (!acquired) {
      throw new RateLimitError(
        `Rate limit exceeded. Waited ${timeout}ms for ${tokens} tokens.`,
        this.bucket.getWaitTime(tokens)
      );
    }

    return fn();
  }

  /**
   * Acquire tokens with exponential backoff retry
   * @param tokens Number of tokens to acquire
   * @param options Retry options
   * @returns Promise<boolean> - true if acquired
   */
  async acquireWithBackoff(
    tokens: number = 1,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      priority?: number;
    } = {}
  ): Promise<boolean> {
    const {
      maxRetries = 3,
      initialDelay = 100,
      maxDelay = 5000,
      priority = 0,
    } = options;

    // Try immediate acquisition first
    if (this.bucket.tryConsume(tokens)) {
      this.totalAcquired++;
      return true;
    }

    // Retry with exponential backoff
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Try to acquire
      if (this.bucket.tryConsume(tokens)) {
        this.totalAcquired++;
        return true;
      }

      // If queue is not too long, try waiting for tokens
      if (this.queue.length < 10) {
        const waitTime = this.bucket.getWaitTime(tokens);
        if (waitTime <= delay) {
          const acquired = await this.acquire(tokens, {
            timeout: delay,
            priority,
          });
          if (acquired) {
            return true;
          }
        }
      }
    }

    this.totalRejected++;
    return false;
  }

  /**
   * Execute a function with rate limiting and exponential backoff
   */
  async executeWithBackoff<T>(
    fn: () => Promise<T>,
    options: {
      tokens?: number;
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      priority?: number;
    } = {}
  ): Promise<T> {
    const { tokens = 1, ...backoffOptions } = options;

    const acquired = await this.acquireWithBackoff(tokens, backoffOptions);

    if (!acquired) {
      throw new RateLimitError(
        `Rate limit exceeded after ${backoffOptions.maxRetries ?? 3} retries with backoff.`,
        this.bucket.getWaitTime(tokens)
      );
    }

    return fn();
  }

  /**
   * Check if rate limited (has pending requests or no tokens)
   */
  isThrottled(): boolean {
    return this.queue.length > 0 || !this.bucket.hasTokens(1);
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get wait time for next available token
   */
  getWaitTime(tokens: number = 1): number {
    return this.bucket.getWaitTime(tokens);
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): RateLimiterStats {
    const bucketStats = this.bucket.getStats();
    return {
      availableTokens: bucketStats.tokens,
      maxTokens: bucketStats.maxTokens,
      refillRate: bucketStats.refillRate,
      queueLength: this.queue.length,
      totalAcquired: this.totalAcquired,
      totalRejected: this.totalRejected,
      lastRefillTime: Date.now(),
    };
  }

  /**
   * Clear the queue (reject all pending requests)
   */
  clearQueue(): void {
    for (const request of this.queue) {
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      request.resolve(false);
    }
    this.queue = [];
  }

  /**
   * Insert request into queue by priority
   */
  private insertByPriority(request: QueuedRequest): void {
    // Higher priority first, then earlier timestamp
    const index = this.queue.findIndex(
      (r) =>
        r.priority < request.priority ||
        (r.priority === request.priority && r.timestamp > request.timestamp)
    );

    if (index === -1) {
      this.queue.push(request);
    } else {
      this.queue.splice(index, 0, request);
    }
  }

  /**
   * Remove a request from the queue
   */
  private removeFromQueue(request: QueuedRequest): void {
    const index = this.queue.indexOf(request);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    const processNext = () => {
      if (this.queue.length === 0) {
        this.processing = false;
        return;
      }

      const request = this.queue[0];

      if (this.bucket.tryConsume(request.tokens)) {
        // Acquired tokens
        this.queue.shift();
        if (request.timeoutId) {
          clearTimeout(request.timeoutId);
        }
        request.resolve(true);

        // Process next immediately (use setTimeout for browser compatibility)
        setTimeout(processNext, 0);
      } else {
        // Wait for tokens to refill
        const waitTime = this.bucket.getWaitTime(request.tokens);
        setTimeout(processNext, Math.min(waitTime, 100)); // Check at least every 100ms
      }
    };

    processNext();
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Preset configurations for different use cases
 */
export const RateLimitPresets = {
  /** High throughput for read operations */
  read: { maxTokens: 100, refillRate: 20 },
  /** Conservative for write operations */
  write: { maxTokens: 20, refillRate: 5 },
  /** Streaming/realtime operations */
  realtime: { maxTokens: 50, refillRate: 10 },
  /** Burst-friendly for occasional heavy use */
  burst: { maxTokens: 200, refillRate: 5 },
  /** Strict limiting for expensive operations */
  strict: { maxTokens: 10, refillRate: 2 },
} as const;

/**
 * Rate limiter registry for managing multiple limiters
 */
export class RateLimiterRegistry {
  private limiters: Map<string, RateLimiter> = new Map();

  /**
   * Get or create a rate limiter by name
   */
  getOrCreate(name: string, config?: Partial<TokenBucketConfig>): RateLimiter {
    let limiter = this.limiters.get(name);

    if (!limiter) {
      limiter = new RateLimiter({ ...config, name });
      this.limiters.set(name, limiter);
    }

    return limiter;
  }

  /**
   * Get an existing rate limiter
   */
  get(name: string): RateLimiter | undefined {
    return this.limiters.get(name);
  }

  /**
   * Get all limiter stats
   */
  getAllStats(): Map<string, RateLimiterStats> {
    const stats = new Map<string, RateLimiterStats>();
    this.limiters.forEach((limiter, name) => {
      stats.set(name, limiter.getStats());
    });
    return stats;
  }

  /**
   * Clear all queues
   */
  clearAllQueues(): void {
    this.limiters.forEach((limiter) => limiter.clearQueue());
  }
}

// Global registry instance
let globalRateLimiterRegistry: RateLimiterRegistry | null = null;

/**
 * Get the global rate limiter registry
 */
export function getRateLimiterRegistry(): RateLimiterRegistry {
  if (!globalRateLimiterRegistry) {
    globalRateLimiterRegistry = new RateLimiterRegistry();
  }
  return globalRateLimiterRegistry;
}

/**
 * Convenience function to execute with a named rate limiter
 */
export async function withRateLimit<T>(
  name: string,
  fn: () => Promise<T>,
  options?: { tokens?: number; timeout?: number; priority?: number; config?: Partial<TokenBucketConfig> }
): Promise<T> {
  const registry = getRateLimiterRegistry();
  const limiter = registry.getOrCreate(name, options?.config);
  return limiter.execute(fn, options);
}
