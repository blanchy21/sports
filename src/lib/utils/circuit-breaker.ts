/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by tracking operation success/failure
 * and temporarily blocking requests when a threshold is exceeded.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests are blocked
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

import { Result, ok, err } from './result';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Number of successes in half-open to close circuit (default: 3) */
  successThreshold: number;
  /** Time in ms before transitioning from OPEN to HALF_OPEN (default: 30000) */
  resetTimeout: number;
  /** Time window in ms for counting failures (default: 60000) */
  monitoringWindow: number;
  /** Name for logging purposes */
  name?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  monitoringWindow: 60000, // 1 minute
};

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly remainingTime: number
  ) {
    super(`Circuit breaker '${circuitName}' is OPEN. Retry after ${remainingTime}ms`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  stateChangedAt: number;
  failureRate: number;
}

/**
 * Failure record for sliding window
 */
interface FailureRecord {
  timestamp: number;
  error?: string;
}

/**
 * Circuit Breaker Class
 *
 * Implements the circuit breaker pattern with three states:
 * CLOSED -> OPEN (after failureThreshold failures)
 * OPEN -> HALF_OPEN (after resetTimeout)
 * HALF_OPEN -> CLOSED (after successThreshold successes)
 * HALF_OPEN -> OPEN (on any failure)
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: FailureRecord[] = [];
  private halfOpenSuccesses: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private stateChangedAt: number = Date.now();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the current state of the circuit
   */
  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Check if the circuit allows a request attempt
   */
  canAttempt(): boolean {
    this.updateState();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
      case CircuitState.HALF_OPEN:
        return true; // Allow limited requests in half-open
      case CircuitState.OPEN:
        return false;
      default:
        return true;
    }
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<Result<T, CircuitOpenError | Error>> {
    this.updateState();
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      const remainingTime = this.getRemainingResetTime();
      return err(new CircuitOpenError(this.config.name || 'unnamed', remainingTime));
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return ok(result);
    } catch (error) {
      this.recordFailure(error instanceof Error ? error.message : String(error));
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;

      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(errorMessage?: string): void {
    const now = Date.now();
    this.lastFailureTime = now;

    // Add failure to sliding window
    this.failures.push({
      timestamp: now,
      error: errorMessage,
    });

    // Clean old failures outside monitoring window
    this.cleanOldFailures();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens the circuit
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we exceeded the failure threshold
      if (this.failures.length >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    this.cleanOldFailures();
    const recentFailures = this.failures.length;
    const failureRate = this.totalRequests > 0
      ? (recentFailures / Math.min(this.totalRequests, 100)) * 100
      : 0;

    return {
      state: this.state,
      failures: recentFailures,
      successes: this.halfOpenSuccesses,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
      failureRate,
    };
  }

  /**
   * Force reset the circuit breaker to CLOSED state
   */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failures = [];
    this.halfOpenSuccesses = 0;
    this.totalRequests = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
  }

  /**
   * Get time remaining until circuit can transition to half-open
   */
  getRemainingResetTime(): number {
    if (this.state !== CircuitState.OPEN) {
      return 0;
    }

    const elapsed = Date.now() - this.stateChangedAt;
    return Math.max(0, this.config.resetTimeout - elapsed);
  }

  /**
   * Update circuit state based on timeouts
   */
  private updateState(): void {
    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - this.stateChangedAt;
      if (elapsed >= this.config.resetTimeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    this.stateChangedAt = Date.now();

    // Reset half-open counters when entering half-open
    if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses = 0;
    }

    // Clear failures when closing
    if (newState === CircuitState.CLOSED) {
      this.failures = [];
      this.halfOpenSuccesses = 0;
    }

    // Log state transition
    if (typeof console !== 'undefined') {
      console.debug(
        `[CircuitBreaker:${this.config.name || 'unnamed'}] ${oldState} -> ${newState}`
      );
    }
  }

  /**
   * Remove failures outside the monitoring window
   */
  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.failures = this.failures.filter((f) => f.timestamp > cutoff);
  }
}

/**
 * Circuit breaker registry for managing multiple circuits
 */
export class CircuitBreakerRegistry {
  private circuits: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: Partial<CircuitBreakerConfig>;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Get or create a circuit breaker by name
   */
  getOrCreate(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let circuit = this.circuits.get(name);

    if (!circuit) {
      circuit = new CircuitBreaker({
        ...this.defaultConfig,
        ...config,
        name,
      });
      this.circuits.set(name, circuit);
    }

    return circuit;
  }

  /**
   * Get an existing circuit breaker
   */
  get(name: string): CircuitBreaker | undefined {
    return this.circuits.get(name);
  }

  /**
   * Check if a circuit exists
   */
  has(name: string): boolean {
    return this.circuits.has(name);
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.circuits.delete(name);
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuits.forEach((circuit) => circuit.reset());
  }

  /**
   * Get stats for all circuits
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    this.circuits.forEach((circuit, name) => {
      stats.set(name, circuit.getStats());
    });
    return stats;
  }

  /**
   * Get all circuit names
   */
  getNames(): string[] {
    return Array.from(this.circuits.keys());
  }

  /**
   * Get circuits in a specific state
   */
  getByState(state: CircuitState): string[] {
    return Array.from(this.circuits.entries())
      .filter(([, circuit]) => circuit.getState() === state)
      .map(([name]) => name);
  }
}

// Global registry instance
let globalRegistry: CircuitBreakerRegistry | null = null;

/**
 * Get the global circuit breaker registry
 */
export function getCircuitBreakerRegistry(): CircuitBreakerRegistry {
  if (!globalRegistry) {
    globalRegistry = new CircuitBreakerRegistry({
      failureThreshold: 5,
      successThreshold: 3,
      resetTimeout: 30000,
      monitoringWindow: 60000,
    });
  }
  return globalRegistry;
}

/**
 * Convenience function to execute through a named circuit
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<Result<T, CircuitOpenError | Error>> {
  const registry = getCircuitBreakerRegistry();
  const circuit = registry.getOrCreate(name, config);
  return circuit.execute(fn);
}
