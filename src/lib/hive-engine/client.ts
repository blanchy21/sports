/**
 * Hive Engine RPC Client
 *
 * Provides a robust client for interacting with Hive Engine sidechain.
 * Features automatic failover, retry logic, and node health tracking.
 */

import { HIVE_ENGINE_CONFIG, HIVE_ENGINE_NODES } from './constants';
import type {
  HiveEngineRequest,
  HiveEngineResponse,
  HiveEngineClientConfig,
  NodeHealth,
  QueryOptions,
} from './types';

// ============================================================================
// Node Health Tracking
// ============================================================================

/** Track health of each node */
const nodeHealth: Map<string, NodeHealth> = new Map();

/** Current node index for round-robin selection */
let currentNodeIndex = 0;

/**
 * Initialize node health tracking
 */
function initNodeHealth(nodes: string[]): void {
  nodes.forEach((url) => {
    if (!nodeHealth.has(url)) {
      nodeHealth.set(url, {
        url,
        healthy: true,
        latency: 0,
        lastCheck: 0,
        failureCount: 0,
      });
    }
  });
}

/**
 * Mark a node as failed
 */
function markNodeFailed(url: string): void {
  const health = nodeHealth.get(url);
  if (health) {
    health.failureCount++;
    health.healthy = health.failureCount < 3;
    health.lastCheck = Date.now();
    nodeHealth.set(url, health);
  }
}

/**
 * Mark a node as successful
 */
function markNodeSuccess(url: string, latency: number): void {
  const health = nodeHealth.get(url);
  if (health) {
    health.healthy = true;
    health.latency = latency;
    health.lastCheck = Date.now();
    health.failureCount = 0;
    nodeHealth.set(url, health);
  }
}

/**
 * Get the next healthy node URL
 */
function getNextHealthyNode(nodes: string[]): string {
  initNodeHealth(nodes);

  // Try to find a healthy node starting from current index
  for (let i = 0; i < nodes.length; i++) {
    const index = (currentNodeIndex + i) % nodes.length;
    const url = nodes[index];
    const health = nodeHealth.get(url);

    if (health?.healthy) {
      currentNodeIndex = (index + 1) % nodes.length;
      return url;
    }
  }

  // If all nodes are unhealthy, reset and try the first one
  nodes.forEach((url) => {
    const health = nodeHealth.get(url);
    if (health) {
      health.healthy = true;
      health.failureCount = 0;
    }
  });

  currentNodeIndex = 1;
  return nodes[0];
}

/**
 * Get all node health statuses
 */
export function getNodeHealthStatus(): NodeHealth[] {
  return Array.from(nodeHealth.values());
}

// ============================================================================
// Request ID Management
// ============================================================================

let requestId = 1;

function getNextRequestId(): number {
  return requestId++;
}

// ============================================================================
// Core RPC Functions
// ============================================================================

/**
 * Make a raw RPC request to a specific node
 */
async function makeRequest<T>(
  nodeUrl: string,
  request: HiveEngineRequest,
  timeout: number
): Promise<HiveEngineResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${nodeUrl}${HIVE_ENGINE_CONFIG.ENDPOINTS.CONTRACTS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Execute an RPC request with failover and retry logic
 */
async function executeWithFailover<T>(
  request: Omit<HiveEngineRequest, 'jsonrpc' | 'id'>,
  config: Required<HiveEngineClientConfig>
): Promise<T> {
  const fullRequest: HiveEngineRequest = {
    jsonrpc: '2.0',
    id: getNextRequestId(),
    ...request,
  } as HiveEngineRequest;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    const nodeUrl = getNextHealthyNode(config.nodes);
    const startTime = Date.now();

    try {
      const response = await makeRequest<T>(nodeUrl, fullRequest, config.timeout);
      const latency = Date.now() - startTime;

      markNodeSuccess(nodeUrl, latency);

      if (response.error) {
        throw new Error(response.error.message || 'Unknown RPC error');
      }

      if (response.result === null || response.result === undefined) {
        // Null result is valid for queries that return no data
        return null as T;
      }

      return response.result;
    } catch (error) {
      markNodeFailed(nodeUrl);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Wait before retry (with exponential backoff)
      if (attempt < config.maxRetries - 1) {
        const delay = config.retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All Hive Engine nodes failed');
}

// ============================================================================
// HiveEngineClient Class
// ============================================================================

/**
 * Hive Engine Client
 *
 * Provides methods for querying Hive Engine sidechain contracts.
 */
export class HiveEngineClient {
  private config: Required<HiveEngineClientConfig>;

  constructor(config: HiveEngineClientConfig = {}) {
    this.config = {
      nodes: config.nodes || [...HIVE_ENGINE_NODES],
      timeout: config.timeout || HIVE_ENGINE_CONFIG.REQUEST_TIMEOUT,
      maxRetries: config.maxRetries || HIVE_ENGINE_CONFIG.MAX_RETRIES,
      retryDelay: config.retryDelay || HIVE_ENGINE_CONFIG.RETRY_DELAY,
    };
  }

  /**
   * Find multiple records from a contract table
   */
  async find<T>(
    contract: string,
    table: string,
    query: Record<string, unknown>,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const result = await executeWithFailover<T[]>(
      {
        method: 'find',
        params: {
          contract,
          table,
          query,
          limit: options.limit || 1000,
          offset: options.offset || 0,
          indexes: options.index
            ? [{ index: options.index, descending: options.descending ?? false }]
            : undefined,
        },
      },
      this.config
    );

    return result || [];
  }

  /**
   * Find a single record from a contract table
   */
  async findOne<T>(
    contract: string,
    table: string,
    query: Record<string, unknown>
  ): Promise<T | null> {
    const result = await executeWithFailover<T>(
      {
        method: 'findOne',
        params: {
          contract,
          table,
          query,
        },
      },
      this.config
    );

    return result || null;
  }

  /**
   * Get the latest block info from the sidechain
   */
  async getLatestBlockInfo(): Promise<{
    blockNumber: number;
    timestamp: number;
    transactions: number;
  } | null> {
    try {
      const nodeUrl = getNextHealthyNode(this.config.nodes);
      const response = await fetch(`${nodeUrl}${HIVE_ENGINE_CONFIG.ENDPOINTS.BLOCKCHAIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: getNextRequestId(),
          method: 'getLatestBlockInfo',
          params: {},
        }),
      });

      const data = await response.json();
      return data.result || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if the client can connect to at least one node
   */
  async isAvailable(): Promise<boolean> {
    try {
      const blockInfo = await this.getLatestBlockInfo();
      return blockInfo !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get current node health status
   */
  getNodeHealth(): NodeHealth[] {
    return getNodeHealthStatus();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: HiveEngineClient | null = null;

/**
 * Get the singleton Hive Engine client instance
 */
export function getHiveEngineClient(config?: HiveEngineClientConfig): HiveEngineClient {
  if (!clientInstance) {
    clientInstance = new HiveEngineClient(config);
  }
  return clientInstance;
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetHiveEngineClient(): void {
  clientInstance = null;
  nodeHealth.clear();
  currentNodeIndex = 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a quantity string with proper precision
 */
export function formatQuantity(amount: number, precision: number = 3): string {
  return amount.toFixed(precision);
}

/**
 * Parse a quantity string to number
 */
export function parseQuantity(quantity: string): number {
  const parsed = parseFloat(quantity);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validate a Hive account name
 * Rules:
 * - 3-16 characters
 * - Starts with a letter
 * - Contains only lowercase letters, numbers, dots, and hyphens
 * - Ends with a letter or number
 * - No consecutive dots or hyphens, or dot-hyphen combinations
 */
export function isValidAccountName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 3 || name.length > 16) return false;
  // Must start with letter, contain only allowed chars, end with letter or number
  if (!/^[a-z][a-z0-9.-]*[a-z0-9]$/.test(name)) return false;
  // No consecutive separators
  if (/\.\.|--|\.-.|-\./.test(name)) return false;
  return true;
}

/**
 * Validate a token quantity
 */
export function isValidQuantity(quantity: string, precision: number = 3): boolean {
  const regex = new RegExp(`^\\d+(\\.\\d{1,${precision}})?$`);
  if (!regex.test(quantity)) return false;
  const value = parseFloat(quantity);
  return value > 0 && isFinite(value);
}
