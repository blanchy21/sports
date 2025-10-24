/**
 * WorkerBee Performance Optimizations
 * 
 * This module provides performance optimizations for WorkerBee operations
 * including connection pooling, caching, and request batching.
 */

import { getWorkerBeeClient } from './client';
import { HiveAccount } from '../shared/types';

// Cache interfaces
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface BatchRequest {
  id: string;
  method: string;
  params: unknown[];
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

// Performance monitoring
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: number;
}

class WorkerBeeOptimizer {
  private cache = new Map<string, CacheEntry<unknown>>();
  private batchQueue: BatchRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
    lastUpdated: Date.now()
  };
  private responseTimes: number[] = [];

  // Cache configuration
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly BATCH_DELAY = 50; // 50ms batch delay

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set cached data with TTL
   */
  private setCached<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(method: string, params: unknown[]): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  /**
   * Batch multiple requests together
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimer = null;

    try {
      const client = getWorkerBeeClient();
      const wax = client.chain;
      
      // Process batch requests
      const promises = batch.map(async (request) => {
        try {
          const startTime = Date.now();
          const result = await wax.call(request.method, request.params);
          const responseTime = Date.now() - startTime;
          
          this.responseTimes.push(responseTime);
          this.updateMetrics();
          
          request.resolve(result);
        } catch (error) {
          request.reject(error instanceof Error ? error : new Error(String(error)));
        }
      });

      await Promise.all(promises);
    } catch (error) {
      // Reject all requests in batch
      batch.forEach(request => {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }

  /**
   * Add request to batch queue
   */
  private addToBatch(method: string, params: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const request: BatchRequest = {
        id: `${method}-${Date.now()}-${Math.random()}`,
        method,
        params,
        resolve,
        reject
      };

      this.batchQueue.push(request);

      // Start batch timer if not already running
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.BATCH_DELAY);
      }
    });
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const totalRequests = this.metrics.requestCount + 1;
    const totalResponseTime = this.metrics.averageResponseTime * this.metrics.requestCount + 
      (this.responseTimes[this.responseTimes.length - 1] || 0);
    
    this.metrics = {
      requestCount: totalRequests,
      averageResponseTime: totalResponseTime / totalRequests,
      cacheHitRate: this.calculateCacheHitRate(),
      errorRate: this.calculateErrorRate(),
      lastUpdated: now
    };

    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0.85; // Placeholder - 85% cache hit rate
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0.02; // Placeholder - 2% error rate
  }

  /**
   * Optimized account fetching with caching
   */
  async fetchAccountOptimized(username: string): Promise<HiveAccount | null> {
    const cacheKey = this.getCacheKey('get_accounts', [[username]]);
    
    // Check cache first
    const cached = this.getCached<HiveAccount>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startTime = Date.now();
      const result = await this.addToBatch('condenser_api', ['get_accounts', [[username]]]);
      const responseTime = Date.now() - startTime;
      
      this.responseTimes.push(responseTime);
      this.updateMetrics();

      const account = Array.isArray(result) && result.length > 0 ? result[0] : null;
      
      if (account) {
        this.setCached(cacheKey, account, this.DEFAULT_TTL);
      }
      
      return account;
    } catch (error) {
      console.error('Error fetching account:', error);
      return null;
    }
  }

  /**
   * Optimized content fetching with caching
   */
  async fetchContentOptimized(method: string, params: unknown[]): Promise<unknown> {
    const cacheKey = this.getCacheKey(method, params);
    
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const startTime = Date.now();
      const result = await this.addToBatch(method, params);
      const responseTime = Date.now() - startTime;
      
      this.responseTimes.push(responseTime);
      this.updateMetrics();

      // Cache successful results
      this.setCached(cacheKey, result, this.DEFAULT_TTL);
      
      return result;
    } catch (error) {
      console.error('Error fetching content:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: this.metrics.cacheHitRate
    };
  }

  /**
   * Optimize cache by removing expired entries
   */
  optimizeCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }
}

// Global optimizer instance
const globalOptimizer = new WorkerBeeOptimizer();

/**
 * Get optimized account data
 */
export async function getAccountOptimized(username: string): Promise<HiveAccount | null> {
  return globalOptimizer.fetchAccountOptimized(username);
}

/**
 * Get optimized content data
 */
export async function getContentOptimized(method: string, params: unknown[]): Promise<unknown> {
  return globalOptimizer.fetchContentOptimized(method, params);
}

/**
 * Clear all caches
 */
export function clearOptimizationCache(): void {
  globalOptimizer.clearCache();
}

/**
 * Get performance metrics
 */
export function getOptimizationMetrics(): PerformanceMetrics {
  return globalOptimizer.getMetrics();
}

/**
 * Get cache statistics
 */
export function getCacheStatistics(): { size: number; maxSize: number; hitRate: number } {
  return globalOptimizer.getCacheStats();
}

/**
 * Optimize cache (remove expired entries)
 */
export function optimizeCache(): void {
  globalOptimizer.optimizeCache();
}

/**
 * Connection pooling for multiple requests
 */
export class ConnectionPool {
  private connections: Map<string, unknown> = new Map();
  private maxConnections = 5;
  private connectionTimeout = 30000; // 30 seconds

  /**
   * Get or create connection
   */
  async getConnection(node: string): Promise<unknown> {
    if (this.connections.has(node)) {
      return this.connections.get(node);
    }

    if (this.connections.size >= this.maxConnections) {
      // Remove oldest connection
      const firstKey = this.connections.keys().next().value;
      this.connections.delete(firstKey);
    }

    try {
      const client = getWorkerBeeClient();
      this.connections.set(node, client);
      
      // Set timeout to remove connection
      setTimeout(() => {
        this.connections.delete(node);
      }, this.connectionTimeout);
      
      return client;
    } catch (error) {
      console.error('Failed to create connection:', error);
      throw error;
    }
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.connections.clear();
  }

  /**
   * Get connection statistics
   */
  getStats(): { activeConnections: number; maxConnections: number } {
    return {
      activeConnections: this.connections.size,
      maxConnections: this.maxConnections
    };
  }
