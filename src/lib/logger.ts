/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unified Logging System
 *
 * Production-ready logging with environment awareness.
 *
 * Features:
 * - JSON format in production for log aggregation
 * - Human-readable format in development
 * - Rate limiting for repeated messages
 * - Log suppression in production (only warn/error unless DEBUG=true)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProduction = process.env.NODE_ENV === 'production';
const isDebugEnabled = process.env.DEBUG === 'true';
const useJsonFormat = isProduction && process.env.LOG_FORMAT !== 'pretty';

/**
 * Rate limiting configuration
 */
interface RateLimitEntry {
  count: number;
  firstSeen: number;
  lastLogged: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 5;
const RATE_LIMIT_COOLDOWN_MS = 10_000;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private rateLimitMap = new Map<string, RateLimitEntry>();

  private getRateLimitKey(level: LogLevel, message: string, context?: string): string {
    return `${level}:${context || ''}:${message}`;
  }

  private shouldRateLimit(level: LogLevel, message: string, context?: string): boolean {
    if (level !== 'warn' && level !== 'error') {
      return false;
    }

    const key = this.getRateLimitKey(level, message, context);
    const now = Date.now();
    const entry = this.rateLimitMap.get(key);

    if (!entry) {
      this.rateLimitMap.set(key, {
        count: 1,
        firstSeen: now,
        lastLogged: now,
      });
      this.cleanupRateLimitMap();
      return false;
    }

    if (now - entry.firstSeen > RATE_LIMIT_WINDOW_MS) {
      this.rateLimitMap.set(key, {
        count: 1,
        firstSeen: now,
        lastLogged: now,
      });
      return false;
    }

    entry.count++;

    if (entry.count > RATE_LIMIT_MAX_PER_WINDOW) {
      if (now - entry.lastLogged > RATE_LIMIT_COOLDOWN_MS) {
        entry.lastLogged = now;
        return false;
      }
      return true;
    }

    entry.lastLogged = now;
    return false;
  }

  private getSuppressionInfo(level: LogLevel, message: string, context?: string): string | null {
    const key = this.getRateLimitKey(level, message, context);
    const entry = this.rateLimitMap.get(key);

    if (entry && entry.count > RATE_LIMIT_MAX_PER_WINDOW) {
      return `(repeated ${entry.count} times)`;
    }
    return null;
  }

  private cleanupRateLimitMap(): void {
    if (this.rateLimitMap.size > 100) {
      const now = Date.now();
      for (const [key, entry] of this.rateLimitMap.entries()) {
        if (now - entry.firstSeen > RATE_LIMIT_WINDOW_MS * 2) {
          this.rateLimitMap.delete(key);
        }
      }
    }
  }

  /**
   * Check if a log level should be output based on environment
   */
  private shouldLog(level: LogLevel): boolean {
    // In production, only log warn and error unless DEBUG is enabled
    if (isProduction && !isDebugEnabled) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  /**
   * Log a debug message (suppressed in production unless DEBUG=true)
   */
  debug(message: string, context?: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, context, data);
    }
  }

  /**
   * Log an info message (suppressed in production unless DEBUG=true)
   */
  info(message: string, context?: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.log('info', message, context, data);
    }
  }

  /**
   * Log a warning message (always logged)
   */
  warn(message: string, context?: string, data?: any): void {
    this.log('warn', message, context, data);
  }

  /**
   * Log an error message (always logged)
   */
  error(message: string, context?: string, err?: Error | unknown, data?: any): void {
    const error = err instanceof Error ? err : undefined;
    this.log('error', message, context, data, error);
  }

  private log(level: LogLevel, message: string, context?: string, data?: any, error?: Error): void {
    if (this.shouldRateLimit(level, message, context)) {
      return;
    }

    const suppressionInfo = this.getSuppressionInfo(level, message, context);
    const displayMessage = suppressionInfo ? `${message} ${suppressionInfo}` : message;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: displayMessage,
      context,
      data,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.outputToConsole(entry);
  }

  private outputToConsole(entry: LogEntry): void {
    const { timestamp, level, message, context, data, error } = entry;

    if (useJsonFormat) {
      const jsonEntry = {
        timestamp,
        level,
        message,
        ...(context && { context }),
        ...(data && { data }),
        ...(error && { error }),
      };

      const jsonString = JSON.stringify(jsonEntry);

      switch (level) {
        case 'debug':
          console.debug(jsonString);
          break;
        case 'info':
          console.info(jsonString);
          break;
        case 'warn':
          console.warn(jsonString);
          break;
        case 'error':
          console.error(jsonString);
          break;
      }
      return;
    }

    // Human-readable format for development
    const timestampStr = new Date(timestamp).toLocaleTimeString();
    const contextStr = context ? `[${context}]` : '';
    const levelStr = level.toUpperCase().padEnd(5);
    const baseMessage = `${timestampStr} ${levelStr} ${contextStr} ${message}`;

    switch (level) {
      case 'debug':
        console.debug(baseMessage, data ?? '');
        break;
      case 'info':
        console.info(baseMessage, data ?? '');
        break;
      case 'warn':
        console.warn(baseMessage, data ?? '');
        break;
      case 'error':
        console.error(baseMessage, data ?? '', error ?? '');
        break;
    }
  }

  /**
   * Get recent logs
   */
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = this.logs.filter((log) => log.level === level);
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
   * Get error summary
   */
  getErrorSummary(): { count: number; errors: string[] } {
    const errorLogs = this.logs.filter((log) => log.level === 'error');
    const errors = errorLogs.map((log) => log.error?.message || log.message);

    return {
      count: errorLogs.length,
      errors: [...new Set(errors)],
    };
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const debug = (message: string, context?: string, data?: any) =>
  logger.debug(message, context, data);

export const info = (message: string, context?: string, data?: any) =>
  logger.info(message, context, data);

export const warn = (message: string, context?: string, data?: any) =>
  logger.warn(message, context, data);

export const error = (message: string, context?: string, err?: Error | unknown, data?: any) =>
  logger.error(message, context, err, data);

export default logger;
