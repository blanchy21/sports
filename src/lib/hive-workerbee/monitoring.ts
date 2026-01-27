/**
 * WorkerBee Monitoring and Error Handling
 *
 * This module provides comprehensive monitoring, error handling,
 * and alerting for WorkerBee operations.
 */

import { HiveError } from '../utils/hive';
import { warn as logWarn, error as logError } from './logger';

// Error types
export enum ErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Error entry interface
export interface ErrorEntry {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: number;
  resolved: boolean;
  retryCount: number;
}

// Performance metrics interface
export interface PerformanceEntry {
  id: string;
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Alert configuration
export interface AlertConfig {
  errorThreshold: number;
  performanceThreshold: number;
  timeWindow: number; // in milliseconds
  enabled: boolean;
}

// Monitoring class
export class WorkerBeeMonitor {
  private errors: ErrorEntry[] = [];
  private performance: PerformanceEntry[] = [];
  private alertConfig: AlertConfig = {
    errorThreshold: 10,
    performanceThreshold: 5000, // 5 seconds
    timeWindow: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  };
  private maxEntries = 1000;

  /**
   * Log an error
   */
  logError(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    stack?: string
  ): string {
    const errorId = this.generateId();
    const error: ErrorEntry = {
      id: errorId,
      type,
      severity,
      message,
      stack,
      context,
      timestamp: Date.now(),
      resolved: false,
      retryCount: 0,
    };

    this.errors.push(error);
    this.cleanupOldEntries();
    this.checkAlerts();

    logError(`[WorkerBee Monitor] ${severity} ${type}: ${message}`, 'WorkerBeeMonitor', undefined, {
      errorId,
      context,
      stack,
    });

    return errorId;
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>
  ): string {
    const entryId = this.generateId();
    const entry: PerformanceEntry = {
      id: entryId,
      operation,
      duration,
      success,
      timestamp: Date.now(),
      metadata,
    };

    this.performance.push(entry);
    this.cleanupOldEntries();
    this.checkAlerts();

    if (!success || duration > this.alertConfig.performanceThreshold) {
      logWarn(
        `[WorkerBee Monitor] Performance issue: ${operation} took ${duration}ms`,
        'WorkerBeeMonitor',
        {
          entryId,
          metadata,
        }
      );
    }

    return entryId;
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string): boolean {
    const error = this.errors.find((e) => e.id === errorId);
    if (error) {
      error.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Increment retry count for error
   */
  incrementRetryCount(errorId: string): boolean {
    const error = this.errors.find((e) => e.id === errorId);
    if (error) {
      error.retryCount++;
      return true;
    }
    return false;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    unresolved: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: ErrorEntry[];
  } {
    const now = Date.now();
    const recentWindow = 24 * 60 * 60 * 1000; // 24 hours
    const recentErrors = this.errors.filter((e) => now - e.timestamp < recentWindow);

    const byType = Object.values(ErrorType).reduce(
      (acc, type) => {
        acc[type] = recentErrors.filter((e) => e.type === type).length;
        return acc;
      },
      {} as Record<ErrorType, number>
    );

    const bySeverity = Object.values(ErrorSeverity).reduce(
      (acc, severity) => {
        acc[severity] = recentErrors.filter((e) => e.severity === severity).length;
        return acc;
      },
      {} as Record<ErrorSeverity, number>
    );

    return {
      total: this.errors.length,
      unresolved: this.errors.filter((e) => !e.resolved).length,
      byType,
      bySeverity,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    slowOperations: PerformanceEntry[];
    recentPerformance: PerformanceEntry[];
  } {
    const now = Date.now();
    const recentWindow = 24 * 60 * 60 * 1000; // 24 hours
    const recentPerformance = this.performance.filter((p) => now - p.timestamp < recentWindow);

    const totalOperations = recentPerformance.length;
    const averageDuration =
      totalOperations > 0
        ? recentPerformance.reduce((sum, p) => sum + p.duration, 0) / totalOperations
        : 0;
    const successRate =
      totalOperations > 0
        ? (recentPerformance.filter((p) => p.success).length / totalOperations) * 100
        : 100;
    const slowOperations = recentPerformance
      .filter((p) => p.duration > this.alertConfig.performanceThreshold)
      .slice(-10);

    return {
      totalOperations,
      averageDuration,
      successRate,
      slowOperations,
      recentPerformance: recentPerformance.slice(-10),
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  } {
    const errorStats = this.getErrorStats();
    const performanceStats = this.getPerformanceStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check error rates
    if (errorStats.unresolved > 10) {
      issues.push('High number of unresolved errors');
      recommendations.push('Review and resolve pending errors');
    }

    if (errorStats.bySeverity[ErrorSeverity.CRITICAL] > 0) {
      issues.push('Critical errors detected');
      recommendations.push('Immediate attention required for critical errors');
    }

    // Check performance
    if (performanceStats.successRate < 95) {
      issues.push('Low success rate detected');
      recommendations.push('Investigate failed operations');
    }

    if (performanceStats.averageDuration > 3000) {
      issues.push('Slow average response time');
      recommendations.push('Consider performance optimizations');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = errorStats.bySeverity[ErrorSeverity.CRITICAL] > 0 ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      issues,
      recommendations,
    };
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.errors = [];
    this.performance = [];
  }

  /**
   * Export data for analysis
   */
  exportData(): {
    errors: ErrorEntry[];
    performance: PerformanceEntry[];
    config: AlertConfig;
    timestamp: number;
  } {
    return {
      errors: [...this.errors],
      performance: [...this.performance],
      config: this.alertConfig,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old entries
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    this.errors = this.errors.filter((e) => now - e.timestamp < maxAge).slice(-this.maxEntries);

    this.performance = this.performance
      .filter((p) => now - p.timestamp < maxAge)
      .slice(-this.maxEntries);
  }

  /**
   * Check for alerts
   */
  private checkAlerts(): void {
    if (!this.alertConfig.enabled) {
      return;
    }

    const now = Date.now();
    const timeWindow = this.alertConfig.timeWindow;
    const recentErrors = this.errors.filter((e) => now - e.timestamp < timeWindow);
    const recentPerformance = this.performance.filter((p) => now - p.timestamp < timeWindow);

    // Check error threshold
    if (recentErrors.length >= this.alertConfig.errorThreshold) {
      logWarn(
        `[WorkerBee Monitor] Alert: High error rate detected (${recentErrors.length} errors in ${timeWindow}ms)`,
        'WorkerBeeMonitor'
      );
    }

    // Check performance threshold
    const slowOperations = recentPerformance.filter(
      (p) => p.duration > this.alertConfig.performanceThreshold
    );
    if (slowOperations.length > 0) {
      logWarn(
        `[WorkerBee Monitor] Alert: ${slowOperations.length} slow operations detected`,
        'WorkerBeeMonitor'
      );
    }
  }
}

// Global monitor instance
const globalMonitor = new WorkerBeeMonitor();

/**
 * Enhanced error handling wrapper
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  context?: Record<string, unknown>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      globalMonitor.logPerformance(operation, duration, true, context);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      globalMonitor.logPerformance(operation, duration, false, context);

      // Determine error type and severity
      let errorType = ErrorType.UNKNOWN_ERROR;
      let severity = ErrorSeverity.MEDIUM;

      if (error instanceof HiveError) {
        switch (error.code) {
          case 'INSUFFICIENT_RC':
            errorType = ErrorType.API_ERROR;
            severity = ErrorSeverity.MEDIUM;
            break;
          case 'MISSING_AUTHORITY':
            errorType = ErrorType.AUTHENTICATION_ERROR;
            severity = ErrorSeverity.HIGH;
            break;
          case 'ACCOUNT_NOT_FOUND':
            errorType = ErrorType.VALIDATION_ERROR;
            severity = ErrorSeverity.LOW;
            break;
          default:
            errorType = ErrorType.API_ERROR;
            severity = ErrorSeverity.MEDIUM;
        }
      } else if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorType = ErrorType.TIMEOUT_ERROR;
          severity = ErrorSeverity.MEDIUM;
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorType = ErrorType.CONNECTION_ERROR;
          severity = ErrorSeverity.HIGH;
        } else if (error.message.includes('rate limit')) {
          errorType = ErrorType.RATE_LIMIT_ERROR;
          severity = ErrorSeverity.MEDIUM;
        }
      }

      globalMonitor.logError(
        errorType,
        error instanceof Error ? error.message : String(error),
        severity,
        { operation, ...context },
        error instanceof Error ? error.stack : undefined
      );

      throw error;
    }
  };
}

/**
 * Get monitoring statistics
 */
export function getMonitoringStats(): {
  errors: {
    total: number;
    unresolved: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recentErrors: Array<{
      id: string;
      type: string;
      severity: string;
      message: string;
      timestamp: number;
      resolved: boolean;
    }>;
  };
  performance: {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    slowOperations: Array<{
      id: string;
      operation: string;
      duration: number;
      success: boolean;
      timestamp: number;
    }>;
    recentPerformance: Array<{
      id: string;
      operation: string;
      duration: number;
      success: boolean;
      timestamp: number;
    }>;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  };
} {
  try {
    return {
      errors: globalMonitor.getErrorStats(),
      performance: globalMonitor.getPerformanceStats(),
      health: globalMonitor.getHealthStatus(),
    };
  } catch (error) {
    logError(
      'Error getting monitoring stats',
      'WorkerBeeMonitor',
      error instanceof Error ? error : undefined
    );
    // Return default data if monitoring fails
    return {
      errors: {
        total: 0,
        unresolved: 0,
        byType: {},
        bySeverity: {},
        recentErrors: [],
      },
      performance: {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 100,
        slowOperations: [],
        recentPerformance: [],
      },
      health: {
        status: 'healthy',
        issues: [],
        recommendations: [],
      },
    };
  }
}

/**
 * Clear monitoring data
 */
export function clearMonitoringData(): void {
  globalMonitor.clearAll();
}

/**
 * Export monitoring data
 */
export function exportMonitoringData(): ReturnType<WorkerBeeMonitor['exportData']> {
  return globalMonitor.exportData();
}

/**
 * Update alert configuration
 */
export function updateAlertConfig(config: Partial<AlertConfig>): void {
  globalMonitor.updateAlertConfig(config);
}
