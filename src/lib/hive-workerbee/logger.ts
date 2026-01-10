/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WorkerBee Logging System
 *
 * This module provides comprehensive logging for WorkerBee operations,
 * including performance monitoring, error tracking, and debug information.
 */

import { getWorkerBeeConfig, getDebugSettings } from './config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  performance?: {
    duration: number;
    operation: string;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class WorkerBeeLogger {
  private config = getWorkerBeeConfig();
  private debugSettings = getDebugSettings();
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  /**
   * Log a debug message
   */
  debug(message: string, context?: string, data?: any): void {
    if (this.debugSettings.workerBee || this.debugSettings.general) {
      this.log('debug', message, context, data);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: string, data?: any): void {
    this.log('info', message, context, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string, data?: any): void {
    this.log('warn', message, context, data);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: string, error?: Error, data?: any): void {
    this.log('error', message, context, data, error);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: string, data?: any): void {
    if (this.config.performanceLogging) {
      this.log('info', `Performance: ${operation}`, context, data, undefined, {
        duration,
        operation,
      });
    }
  }

  /**
   * Log WorkerBee-specific operations
   */
  workerBee(message: string, context?: string, data?: any): void {
    if (this.debugSettings.workerBee) {
      this.log('debug', `[WorkerBee] ${message}`, context, data);
    }
  }

  /**
   * Log Wax-specific operations
   */
  wax(message: string, context?: string, data?: any): void {
    if (this.debugSettings.wax) {
      this.log('debug', `[Wax] ${message}`, context, data);
    }
  }

  /**
   * Log real-time events
   */
  realtime(event: string, context?: string, data?: any): void {
    if (this.config.realtimeEnabled) {
      this.log('info', `[Realtime] ${event}`, context, data);
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    error?: Error,
    performance?: { duration: number; operation: string }
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      performance,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Add to logs array
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output based on log level
    this.outputToConsole(entry);
  }

  /**
   * Output to console with appropriate formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const { timestamp, level, message, context, data, error, performance } = entry;
    
    const timestampStr = new Date(timestamp).toLocaleTimeString();
    const contextStr = context ? `[${context}]` : '';
    const levelStr = level.toUpperCase().padEnd(5);
    
    const baseMessage = `${timestampStr} ${levelStr} ${contextStr} ${message}`;
    
    switch (level) {
      case 'debug':
        if (this.debugSettings.workerBee || this.debugSettings.general) {
          console.debug(baseMessage, data || '');
        }
        break;
      case 'info':
        console.info(baseMessage, data || '');
        break;
      case 'warn':
        console.warn(baseMessage, data || '');
        break;
      case 'error':
        console.error(baseMessage, data || '', error || '');
        break;
    }

    // Performance logging
    if (performance) {
      console.info(`⏱️  ${performance.operation}: ${performance.duration}ms`);
    }
  }

  /**
   * Get recent logs
   */
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): { operation: string; avgDuration: number; count: number }[] {
    const performanceLogs = this.logs.filter(log => log.performance);
    const metrics: { [operation: string]: { totalDuration: number; count: number } } = {};
    
    performanceLogs.forEach(log => {
      if (log.performance) {
        const { operation, duration } = log.performance;
        if (!metrics[operation]) {
          metrics[operation] = { totalDuration: 0, count: 0 };
        }
        metrics[operation].totalDuration += duration;
        metrics[operation].count += 1;
      }
    });
    
    return Object.entries(metrics).map(([operation, data]) => ({
      operation,
      avgDuration: data.totalDuration / data.count,
      count: data.count,
    }));
  }

  /**
   * Get error summary
   */
  getErrorSummary(): { count: number; errors: string[] } {
    const errorLogs = this.logs.filter(log => log.level === 'error');
    const errors = errorLogs.map(log => log.error?.message || log.message);
    
    return {
      count: errorLogs.length,
      errors: [...new Set(errors)],
    };
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
