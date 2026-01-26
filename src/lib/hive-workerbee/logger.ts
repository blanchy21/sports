/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WorkerBee Logging System
 *
 * Extends the shared logger with WorkerBee-specific functionality.
 *
 * Features:
 * - All features from shared logger
 * - WorkerBee-specific log methods
 * - Performance tracking for Hive operations
 */

import { logger as sharedLogger, LogLevel, LogEntry } from '@/lib/logger';
import { getWorkerBeeConfig, getDebugSettings } from './config';

// Re-export types from shared logger
export type { LogLevel, LogEntry };

class WorkerBeeLogger {
  private config = getWorkerBeeConfig();
  private debugSettings = getDebugSettings();

  /**
   * Log a debug message
   */
  debug(message: string, context?: string, data?: any): void {
    if (this.debugSettings.workerBee || this.debugSettings.general) {
      sharedLogger.debug(message, context, data);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: string, data?: any): void {
    sharedLogger.info(message, context, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string, data?: any): void {
    sharedLogger.warn(message, context, data);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: string, error?: Error, data?: any): void {
    sharedLogger.error(message, context, error, data);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: string, data?: any): void {
    if (this.config.performanceLogging) {
      sharedLogger.info(`Performance: ${operation} completed in ${duration}ms`, context, {
        ...data,
        performance: { operation, duration },
      });
    }
  }

  /**
   * Log WorkerBee-specific operations
   */
  workerBee(message: string, context?: string, data?: any): void {
    if (this.debugSettings.workerBee) {
      sharedLogger.debug(`[WorkerBee] ${message}`, context, data);
    }
  }

  /**
   * Log Wax-specific operations
   */
  wax(message: string, context?: string, data?: any): void {
    if (this.debugSettings.wax) {
      sharedLogger.debug(`[Wax] ${message}`, context, data);
    }
  }

  /**
   * Log real-time events
   */
  realtime(event: string, context?: string, data?: any): void {
    if (this.config.realtimeEnabled) {
      sharedLogger.info(`[Realtime] ${event}`, context, data);
    }
  }

  /**
   * Get recent logs (delegates to shared logger)
   */
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    return sharedLogger.getLogs(level, limit);
  }

  /**
   * Clear logs (delegates to shared logger)
   */
  clearLogs(): void {
    sharedLogger.clearLogs();
  }

  /**
   * Get error summary (delegates to shared logger)
   */
  getErrorSummary(): { count: number; errors: string[] } {
    return sharedLogger.getErrorSummary();
  }
}

// Create singleton instance
export const logger = new WorkerBeeLogger();

// Export convenience functions
export const debug = (message: string, context?: string, data?: any) =>
  logger.debug(message, context, data);

export const info = (message: string, context?: string, data?: any) =>
  logger.info(message, context, data);

export const warn = (message: string, context?: string, data?: any) =>
  logger.warn(message, context, data);

export const error = (message: string, context?: string, error?: Error, data?: any) =>
  logger.error(message, context, error, data);

export const performance = (operation: string, duration: number, context?: string, data?: any) =>
  logger.performance(operation, duration, context, data);

export const workerBee = (message: string, context?: string, data?: any) =>
  logger.workerBee(message, context, data);

export const wax = (message: string, context?: string, data?: any) =>
  logger.wax(message, context, data);

export const realtime = (event: string, context?: string, data?: any) =>
  logger.realtime(event, context, data);

export default logger;
