/**
 * Node Health Manager
 *
 * Proactive health monitoring and intelligent node selection for Hive API nodes.
 * Integrates with existing monitoring system to provide real-time node health data.
 * Enhanced with circuit breaker pattern for better failure handling.
 */

import { checkHiveNodeAvailability } from './api';
import { getHiveApiNodes } from './api';
import { workerBee as workerBeeLog, warn as logWarn, error as logError } from './logger';
import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerStats
} from '@/lib/utils/circuit-breaker';

// Node health status interface
export interface NodeHealthStatus {
  url: string;
  isHealthy: boolean;
  latency: number;
  lastChecked: number;
  successRate: number;
  consecutiveFailures: number;
  lastError?: string;
  healthScore: number; // 0-100, higher is better
  circuitState?: CircuitState;
}

// Node health configuration
export interface NodeHealthConfig {
  checkInterval: number; // milliseconds
  timeout: number; // milliseconds
  maxConsecutiveFailures: number;
  healthCheckEndpoint: string;
  enableProactiveMonitoring: boolean;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
}

// Node health report for monitoring
export interface NodeHealthReport {
  totalNodes: number;
  healthyNodes: number;
  unhealthyNodes: number;
  averageLatency: number;
  bestNode: string;
  worstNode: string;
  nodeStatuses: NodeHealthStatus[];
  circuitStats: Map<string, CircuitBreakerStats>;
}

// Default configuration
const DEFAULT_CONFIG: NodeHealthConfig = {
  checkInterval: 30000, // 30 seconds
  timeout: 15000, // 15 seconds - match REQUEST_TIMEOUT_MS in api.ts
  maxConsecutiveFailures: 3,
  healthCheckEndpoint: 'condenser_api.get_dynamic_global_properties',
  enableProactiveMonitoring: true
};

/**
 * Node Health Manager Class
 *
 * Manages proactive health monitoring of Hive API nodes with intelligent selection.
 * Includes circuit breaker integration for better failure handling.
 */
export class NodeHealthManager {
  private nodeHealth: Map<string, NodeHealthStatus> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private config: NodeHealthConfig;
  private isMonitoring: boolean = false;
  private nodeUrls: string[];

  constructor(config: Partial<NodeHealthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nodeUrls = getHiveApiNodes();
    this.initializeNodeHealth();
    this.initializeCircuitBreakers();
  }

  /**
   * Initialize circuit breakers for all nodes
   */
  private initializeCircuitBreakers(): void {
    const circuitConfig: Partial<CircuitBreakerConfig> = {
      failureThreshold: this.config.maxConsecutiveFailures,
      successThreshold: 2,
      resetTimeout: 30000, // 30 seconds
      monitoringWindow: 60000, // 1 minute
      ...this.config.circuitBreaker,
    };

    this.nodeUrls.forEach(url => {
      this.circuitBreakers.set(url, new CircuitBreaker({
        ...circuitConfig,
        name: new URL(url).hostname,
      }));
    });
  }

  /**
   * Initialize node health tracking for all nodes
   */
  private initializeNodeHealth(): void {
    this.nodeUrls.forEach(url => {
      this.nodeHealth.set(url, {
        url,
        isHealthy: true, // Assume healthy initially
        latency: 0,
        lastChecked: 0,
        successRate: 100,
        consecutiveFailures: 0,
        healthScore: 50 // Start with neutral score
      });
    });
  }

  /**
   * Start proactive health monitoring
   */
  public async startProactiveMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      workerBeeLog('[Node Health] Monitoring already active');
      return;
    }

    if (!this.config.enableProactiveMonitoring) {
      workerBeeLog('[Node Health] Proactive monitoring disabled');
      return;
    }

    workerBeeLog(`[Node Health] Starting proactive monitoring (interval: ${this.config.checkInterval}ms)`);
    
    // Initial health check
    await this.checkAllNodes();
    
    // Set up interval
    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllNodes();
    }, this.config.checkInterval);
    
    this.isMonitoring = true;
  }

  /**
   * Stop proactive health monitoring
   */
  public stopProactiveMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.isMonitoring = false;
    workerBeeLog('[Node Health] Proactive monitoring stopped');
  }

  /**
   * Check health of all nodes
   */
  public async checkAllNodes(): Promise<NodeHealthReport> {
    const startTime = Date.now();
    const checkPromises = this.nodeUrls.map(url => this.checkNodeHealth(url));
    
    try {
      await Promise.allSettled(checkPromises);
    } catch (error) {
      logError('[Node Health] Error during health check', 'nodeHealth', error instanceof Error ? error : undefined);
    }

    const report = this.generateHealthReport();
    const duration = Date.now() - startTime;
    
    workerBeeLog(`[Node Health] Health check completed in ${duration}ms - ${report.healthyNodes}/${report.totalNodes} nodes healthy`);
    
    return report;
  }

  /**
   * Check health of a specific node
   */
  public async checkNodeHealth(nodeUrl: string): Promise<NodeHealthStatus> {
    const startTime = Date.now();
    let isHealthy = false;
    let latency = 0;
    let error: string | undefined;

    try {
      // Use existing health check function (it now has built-in timeout)
      // The checkHiveNodeAvailability function uses fetchWithTimeout with 10s timeout
      isHealthy = await checkHiveNodeAvailability(nodeUrl);
      latency = Date.now() - startTime;
      
      // If health check took too long, mark as unhealthy even if it succeeded
      if (latency >= this.config.timeout) {
        isHealthy = false;
        error = `Health check took too long (${latency}ms >= ${this.config.timeout}ms)`;
      }
    } catch (err) {
      isHealthy = false;
      latency = Date.now() - startTime;
      error = err instanceof Error ? err.message : String(err);
      
      // Mark timeout errors specifically
      if (error.includes('timeout') || error.includes('aborted') || latency >= this.config.timeout) {
        error = `Health check timed out after ${latency}ms`;
      }
    }

    // Update node health status
    const currentStatus = this.nodeHealth.get(nodeUrl);
    if (currentStatus) {
      const newStatus: NodeHealthStatus = {
        ...currentStatus,
        isHealthy,
        latency,
        lastChecked: Date.now(),
        consecutiveFailures: isHealthy ? 0 : currentStatus.consecutiveFailures + 1,
        lastError: isHealthy ? undefined : error,
        successRate: this.calculateSuccessRate(nodeUrl, isHealthy),
        healthScore: this.calculateHealthScore(nodeUrl, isHealthy, latency)
      };

      this.nodeHealth.set(nodeUrl, newStatus);
      return newStatus;
    }

    // If node not found, create new entry
    const newStatus: NodeHealthStatus = {
      url: nodeUrl,
      isHealthy,
      latency,
      lastChecked: Date.now(),
      successRate: isHealthy ? 100 : 0,
      consecutiveFailures: isHealthy ? 0 : 1,
      lastError: error,
      healthScore: isHealthy ? 80 : 20
    };

    this.nodeHealth.set(nodeUrl, newStatus);
    return newStatus;
  }

  /**
   * Get the best available node based on health score and circuit state
   */
  public getBestNode(): string {
    const healthyNodes = Array.from(this.nodeHealth.values())
      .filter(node => {
        // Check basic health
        if (!node.isHealthy || node.consecutiveFailures >= this.config.maxConsecutiveFailures) {
          return false;
        }
        // Check circuit breaker state
        const circuit = this.circuitBreakers.get(node.url);
        if (circuit && !circuit.canAttempt()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.healthScore - a.healthScore);

    if (healthyNodes.length === 0) {
      // Try to find a node in HALF_OPEN state (testing recovery)
      const halfOpenNodes = Array.from(this.nodeHealth.values())
        .filter(node => {
          const circuit = this.circuitBreakers.get(node.url);
          return circuit?.getState() === CircuitState.HALF_OPEN;
        });

      if (halfOpenNodes.length > 0) {
        workerBeeLog(`[Node Health] Using half-open node: ${halfOpenNodes[0].url}`);
        return halfOpenNodes[0].url;
      }

      logWarn('[Node Health] No healthy nodes available, using first node as fallback', 'nodeHealth');
      return this.nodeUrls[0];
    }

    const bestNode = healthyNodes[0];
    workerBeeLog(`[Node Health] Selected best node: ${bestNode.url} (score: ${bestNode.healthScore})`);
    return bestNode.url;
  }

  /**
   * Record the result of a node operation (updates circuit breaker)
   */
  public recordNodeResult(nodeUrl: string, success: boolean, errorMessage?: string): void {
    const circuit = this.circuitBreakers.get(nodeUrl);
    if (circuit) {
      if (success) {
        circuit.recordSuccess();
      } else {
        circuit.recordFailure(errorMessage);
      }
    }

    // Update node health status
    const status = this.nodeHealth.get(nodeUrl);
    if (status) {
      if (success) {
        status.consecutiveFailures = 0;
      } else {
        status.consecutiveFailures++;
        status.lastError = errorMessage;
      }
      status.circuitState = circuit?.getState();
      this.nodeHealth.set(nodeUrl, status);
    }
  }

  /**
   * Get circuit breaker for a specific node
   */
  public getCircuitBreaker(nodeUrl: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(nodeUrl);
  }

  /**
   * Get all circuit breaker stats
   */
  public getCircuitStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    this.circuitBreakers.forEach((circuit, url) => {
      stats.set(url, circuit.getStats());
    });
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  public resetAllCircuits(): void {
    this.circuitBreakers.forEach(circuit => circuit.reset());
    workerBeeLog('[Node Health] All circuit breakers reset');
  }

  /**
   * Get health status of a specific node
   */
  public getNodeStatus(nodeUrl: string): NodeHealthStatus | null {
    return this.nodeHealth.get(nodeUrl) || null;
  }

  /**
   * Get all node health statuses
   */
  public getAllNodeStatuses(): NodeHealthStatus[] {
    return Array.from(this.nodeHealth.values());
  }

  /**
   * Get comprehensive health report
   */
  public getHealthReport(): NodeHealthReport {
    return this.generateHealthReport();
  }

  /**
   * Check if monitoring is active
   */
  public isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<NodeHealthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    workerBeeLog('[Node Health] Configuration updated', undefined, this.config);
  }

  /**
   * Reset all node health data
   */
  public resetHealthData(): void {
    this.initializeNodeHealth();
    workerBeeLog('[Node Health] Health data reset');
  }

  /**
   * Calculate success rate for a node
   */
  private calculateSuccessRate(nodeUrl: string, currentSuccess: boolean): number {
    const current = this.nodeHealth.get(nodeUrl);
    if (!current) return currentSuccess ? 100 : 0;

    // Simple moving average over last 10 checks
    const history = this.getNodeHistory(nodeUrl);
    const recentChecks = history.slice(-10);
    const successCount = recentChecks.filter(check => check).length;
    
    return recentChecks.length > 0 ? (successCount / recentChecks.length) * 100 : current.successRate;
  }

  /**
   * Calculate health score for a node (0-100)
   */
  private calculateHealthScore(nodeUrl: string, isHealthy: boolean, latency: number): number {
    let score = 0;

    // Base score from health status
    if (isHealthy) {
      score += 40;
    }

    // Latency score (lower is better)
    if (latency < 1000) {
      score += 30;
    } else if (latency < 3000) {
      score += 20;
    } else if (latency < 5000) {
      score += 10;
    }

    // Success rate score
    const successRate = this.calculateSuccessRate(nodeUrl, isHealthy);
    score += (successRate / 100) * 20;

    // Penalty for consecutive failures
    const current = this.nodeHealth.get(nodeUrl);
    if (current && current.consecutiveFailures > 0) {
      score -= current.consecutiveFailures * 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate comprehensive health report
   */
  private generateHealthReport(): NodeHealthReport {
    const allNodes = Array.from(this.nodeHealth.values());
    const healthyNodes = allNodes.filter(node => node.isHealthy);
    const unhealthyNodes = allNodes.filter(node => !node.isHealthy);

    const averageLatency = allNodes.length > 0
      ? allNodes.reduce((sum, node) => sum + node.latency, 0) / allNodes.length
      : 0;

    const bestNode = healthyNodes.length > 0
      ? healthyNodes.sort((a, b) => b.healthScore - a.healthScore)[0].url
      : allNodes[0]?.url || '';

    const worstNode = allNodes.length > 0
      ? allNodes.sort((a, b) => a.healthScore - b.healthScore)[0].url
      : '';

    // Add circuit state to node statuses
    const nodeStatuses = allNodes.map(node => ({
      ...node,
      circuitState: this.circuitBreakers.get(node.url)?.getState(),
    }));

    return {
      totalNodes: allNodes.length,
      healthyNodes: healthyNodes.length,
      unhealthyNodes: unhealthyNodes.length,
      averageLatency,
      bestNode,
      worstNode,
      nodeStatuses,
      circuitStats: this.getCircuitStats(),
    };
  }

  /**
   * Get node check history (simplified - in real implementation, you'd store this)
   */
  private getNodeHistory(nodeUrl: string): boolean[] {
    // This is a simplified implementation
    // In a real scenario, you'd store check history
    const current = this.nodeHealth.get(nodeUrl);
    return current ? [current.isHealthy] : [];
  }
}

// Global node health manager instance
let globalNodeHealthManager: NodeHealthManager | null = null;

/**
 * Get or create global node health manager
 */
export function getNodeHealthManager(): NodeHealthManager {
  if (!globalNodeHealthManager) {
    globalNodeHealthManager = new NodeHealthManager();
  }
  return globalNodeHealthManager;
}

/**
 * Start global node health monitoring
 */
export async function startNodeHealthMonitoring(): Promise<void> {
  const manager = getNodeHealthManager();
  await manager.startProactiveMonitoring();
}

/**
 * Stop global node health monitoring
 */
export function stopNodeHealthMonitoring(): void {
  const manager = getNodeHealthManager();
  manager.stopProactiveMonitoring();
}

/**
 * Get best available node
 */
export function getBestAvailableNode(): string {
  const manager = getNodeHealthManager();
  return manager.getBestNode();
}

/**
 * Get node health report
 */
export function getNodeHealthReport(): NodeHealthReport {
  const manager = getNodeHealthManager();
  return manager.getHealthReport();
}

/**
 * Check if node health monitoring is active
 */
export function isNodeHealthMonitoringActive(): boolean {
  const manager = getNodeHealthManager();
  return manager.isMonitoringActive();
}

/**
 * Record a node operation result (updates circuit breaker)
 */
export function recordNodeResult(nodeUrl: string, success: boolean, errorMessage?: string): void {
  const manager = getNodeHealthManager();
  manager.recordNodeResult(nodeUrl, success, errorMessage);
}

/**
 * Get circuit stats for all nodes
 */
export function getCircuitStats(): Map<string, CircuitBreakerStats> {
  const manager = getNodeHealthManager();
  return manager.getCircuitStats();
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuits(): void {
  const manager = getNodeHealthManager();
  manager.resetAllCircuits();
}

// Re-export CircuitState for consumers
export { CircuitState } from '@/lib/utils/circuit-breaker';
