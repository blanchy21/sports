/**
 * Graceful Degradation System
 *
 * Provides fallback mechanisms when blockchain nodes are unavailable.
 * Serves stale cached data with clear staleness indicators rather than failing completely.
 */

import { TieredCache, getTieredCache } from '@/lib/cache';
import {
  ApiResult,
  ApiError,
  ApiMeta,
  apiOk,
  apiErr,
  isApiOk,
} from '@/lib/utils/result';
import { workerBee as workerBeeLog, warn as logWarn } from './logger';

/**
 * Degradation reason
 */
export type DegradationReason =
  | 'circuit_open'
  | 'all_nodes_failed'
  | 'rate_limited'
  | 'timeout'
  | 'network_error';

/**
 * Stale data configuration
 */
export interface StaleDataConfig {
  /** Maximum age of stale data in ms (default: 300000 = 5 minutes) */
  maxStaleAge: number;
  /** Serve stale on any error (default: true) */
  serveStaleOnError: boolean;
  /** Serve stale on timeout (default: true) */
  serveStaleOnTimeout: boolean;
  /** Serve stale when circuit is open (default: true) */
  serveStaleOnCircuitOpen: boolean;
  /** Cache TTL in ms (default: 300000 = 5 minutes) */
  cacheTTL: number;
  /** Tags for cache invalidation */
  tags?: string[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: StaleDataConfig = {
  maxStaleAge: 5 * 60 * 1000, // 5 minutes
  serveStaleOnError: true,
  serveStaleOnTimeout: true,
  serveStaleOnCircuitOpen: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
};

/**
 * Degradation status for monitoring
 */
export interface DegradationStatus {
  isDegraded: boolean;
  degradedOperations: string[];
  averageStaleAge: number;
  totalStaleResponses: number;
  lastDegradationTime: number | null;
}

/**
 * Operation tracking for degradation
 */
interface DegradedOperation {
  key: string;
  reason: DegradationReason;
  staleAge: number;
  timestamp: number;
}

/**
 * Graceful Degradation Manager
 */
export class GracefulDegradation {
  private cache: TieredCache | null = null;
  private degradedOperations: DegradedOperation[] = [];
  private maxTrackedOperations = 100;
  private isInitialized = false;

  /**
   * Initialize the degradation system
   */
  private async ensureInitialized(): Promise<TieredCache> {
    if (!this.isInitialized || !this.cache) {
      this.cache = await getTieredCache();
      this.isInitialized = true;
    }
    return this.cache;
  }

  /**
   * Fetch with graceful degradation
   * Returns stale data if fresh fetch fails
   */
  async fetchWithFallback<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    options: Partial<StaleDataConfig> = {}
  ): Promise<ApiResult<T>> {
    const config = { ...DEFAULT_CONFIG, ...options };
    const cache = await this.ensureInitialized();

    try {
      // Try to fetch fresh data
      const freshData = await fetcher();

      // Cache the fresh data
      await cache.set(cacheKey, freshData, {
        ttl: config.cacheTTL,
        tags: config.tags,
      });

      // Clear any degraded status for this key
      this.clearDegradedOperation(cacheKey);

      return apiOk(freshData, { cached: false, stale: false });
    } catch (error) {
      // Fetch failed - try to serve stale data
      return this.handleFetchFailure<T>(cacheKey, error, config);
    }
  }

  /**
   * Get or fetch with degradation support
   * Checks cache first, fetches if needed, falls back to stale on error
   */
  async getOrFetch<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    options: Partial<StaleDataConfig> = {}
  ): Promise<ApiResult<T>> {
    const config = { ...DEFAULT_CONFIG, ...options };
    const cache = await this.ensureInitialized();

    // Check cache first
    const cacheResult = await cache.getWithMeta<T>(cacheKey);

    if (cacheResult.hit && cacheResult.value !== null) {
      // Fresh cache hit
      return apiOk(cacheResult.value, {
        cached: true,
        stale: false,
        duration: 0,
      });
    }

    // Cache miss or stale - try to fetch
    try {
      const freshData = await fetcher();

      // Cache the fresh data
      await cache.set(cacheKey, freshData, {
        ttl: config.cacheTTL,
        tags: config.tags,
      });

      this.clearDegradedOperation(cacheKey);

      return apiOk(freshData, { cached: false, stale: false });
    } catch (error) {
      // Fetch failed - check if we have stale data
      if (cacheResult.stale && cacheResult.value !== null) {
        return this.serveStaleData<T>(
          cacheKey,
          cacheResult.value,
          cacheResult.age,
          this.classifyError(error)
        );
      }

      // No stale data available - return error
      return this.handleFetchFailure<T>(cacheKey, error, config);
    }
  }

  /**
   * Handle fetch failure with stale data fallback
   */
  private async handleFetchFailure<T>(
    cacheKey: string,
    error: unknown,
    config: StaleDataConfig
  ): Promise<ApiResult<T>> {
    const cache = await this.ensureInitialized();
    const reason = this.classifyError(error);

    // Check if we should serve stale data for this error type
    const shouldServeStale =
      (config.serveStaleOnError && reason !== 'circuit_open') ||
      (config.serveStaleOnCircuitOpen && reason === 'circuit_open') ||
      (config.serveStaleOnTimeout && reason === 'timeout');

    if (shouldServeStale) {
      // Try to get stale data from cache
      const cacheResult = await cache.getWithMeta<T>(cacheKey);

      if (cacheResult.value !== null && cacheResult.age <= config.maxStaleAge) {
        return this.serveStaleData<T>(
          cacheKey,
          cacheResult.value,
          cacheResult.age,
          reason
        );
      }
    }

    // No stale data or too old - return error
    const apiError = this.createApiError(error, reason);
    logWarn(`[Degradation] No stale data available for ${cacheKey}`, 'graceful-degradation');

    return apiErr(apiError);
  }

  /**
   * Serve stale data with metadata
   */
  private serveStaleData<T>(
    cacheKey: string,
    value: T,
    age: number,
    reason: DegradationReason
  ): ApiResult<T> {
    // Track degraded operation
    this.trackDegradedOperation(cacheKey, reason, age);

    workerBeeLog(
      `[Degradation] Serving stale data for ${cacheKey} (age: ${age}ms, reason: ${reason})`,
      'graceful-degradation'
    );

    const meta: ApiMeta = {
      cached: true,
      stale: true,
      staleAge: age,
    };

    return apiOk(value, meta);
  }

  /**
   * Classify error to determine degradation reason
   */
  private classifyError(error: unknown): DegradationReason {
    if (!(error instanceof Error)) {
      return 'network_error';
    }

    const message = error.message.toLowerCase();

    if (message.includes('circuit') || message.includes('breaker')) {
      return 'circuit_open';
    }
    if (message.includes('timeout') || message.includes('aborted')) {
      return 'timeout';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limited';
    }
    if (message.includes('all') && message.includes('failed')) {
      return 'all_nodes_failed';
    }

    return 'network_error';
  }

  /**
   * Create API error from caught error
   */
  private createApiError(error: unknown, reason: DegradationReason): ApiError {
    const message = error instanceof Error ? error.message : String(error);

    const codeMap: Record<DegradationReason, ApiError['code']> = {
      circuit_open: 'CIRCUIT_OPEN',
      all_nodes_failed: 'NETWORK_ERROR',
      rate_limited: 'RATE_LIMITED',
      timeout: 'TIMEOUT',
      network_error: 'NETWORK_ERROR',
    };

    return {
      code: codeMap[reason],
      message,
      retryable: reason !== 'circuit_open',
    };
  }

  /**
   * Track a degraded operation for monitoring
   */
  private trackDegradedOperation(
    key: string,
    reason: DegradationReason,
    staleAge: number
  ): void {
    this.degradedOperations.push({
      key,
      reason,
      staleAge,
      timestamp: Date.now(),
    });

    // Keep only recent operations
    if (this.degradedOperations.length > this.maxTrackedOperations) {
      this.degradedOperations = this.degradedOperations.slice(-this.maxTrackedOperations);
    }
  }

  /**
   * Clear degraded operation when fresh data is available
   */
  private clearDegradedOperation(key: string): void {
    this.degradedOperations = this.degradedOperations.filter((op) => op.key !== key);
  }

  /**
   * Get degradation status for monitoring
   */
  getDegradationStatus(): DegradationStatus {
    const now = Date.now();
    const recentWindow = 5 * 60 * 1000; // 5 minutes

    const recentOperations = this.degradedOperations.filter(
      (op) => now - op.timestamp < recentWindow
    );

    const uniqueKeys = [...new Set(recentOperations.map((op) => op.key))];
    const averageStaleAge =
      recentOperations.length > 0
        ? recentOperations.reduce((sum, op) => sum + op.staleAge, 0) / recentOperations.length
        : 0;

    const lastDegradation =
      recentOperations.length > 0
        ? Math.max(...recentOperations.map((op) => op.timestamp))
        : null;

    return {
      isDegraded: recentOperations.length > 0,
      degradedOperations: uniqueKeys,
      averageStaleAge,
      totalStaleResponses: this.degradedOperations.length,
      lastDegradationTime: lastDegradation,
    };
  }

  /**
   * Reset tracking (for testing)
   */
  reset(): void {
    this.degradedOperations = [];
  }
}

// Global instance
let globalDegradation: GracefulDegradation | null = null;

/**
 * Get the global graceful degradation instance
 */
export function getGracefulDegradation(): GracefulDegradation {
  if (!globalDegradation) {
    globalDegradation = new GracefulDegradation();
  }
  return globalDegradation;
}

/**
 * Convenience function for fetch with fallback
 */
export async function fetchWithGracefulFallback<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: Partial<StaleDataConfig>
): Promise<ApiResult<T>> {
  const degradation = getGracefulDegradation();
  return degradation.fetchWithFallback(cacheKey, fetcher, options);
}

/**
 * Convenience function for get or fetch with degradation
 */
export async function getOrFetchWithFallback<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: Partial<StaleDataConfig>
): Promise<ApiResult<T>> {
  const degradation = getGracefulDegradation();
  return degradation.getOrFetch(cacheKey, fetcher, options);
}

/**
 * Get current degradation status
 */
export function getDegradationStatus(): DegradationStatus {
  const degradation = getGracefulDegradation();
  return degradation.getDegradationStatus();
}

/**
 * Check if the system is currently in degraded mode
 */
export function isSystemDegraded(): boolean {
  return getDegradationStatus().isDegraded;
}

/**
 * Wrapper that adds graceful degradation to any async function
 */
export function withGracefulDegradation<T>(
  cacheKey: string,
  options?: Partial<StaleDataConfig>
): (fetcher: () => Promise<T>) => Promise<ApiResult<T>> {
  return (fetcher: () => Promise<T>) => {
    const degradation = getGracefulDegradation();
    return degradation.getOrFetch(cacheKey, fetcher, options);
  };
}

/**
 * Helper to unwrap ApiResult, preferring stale data over errors
 */
export function unwrapWithStale<T>(result: ApiResult<T>, defaultValue: T): T {
  if (isApiOk(result)) {
    return result.data;
  }
  if (result.staleData !== undefined) {
    return result.staleData;
  }
  return defaultValue;
}
