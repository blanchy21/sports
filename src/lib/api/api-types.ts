/**
 * API Response Types, Logger, and Utilities
 *
 * Leaf dependency — imports nothing from sibling files.
 */

import type { ApiErrorCode } from './api-errors';

// ============================================================================
// Standard API Response Envelope Types
// ============================================================================

/**
 * Standard metadata for API responses
 */
export interface ApiResponseMeta {
  /** Request tracking ID */
  requestId?: string;
  /** Response timestamp */
  timestamp?: string;
  /** Whether response was from cache */
  cached?: boolean;
  /** Whether cached data is stale */
  stale?: boolean;
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  /** Total number of items */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  limit: number;
  /** Whether there are more pages */
  hasMore: boolean;
}

/**
 * Structured API error response envelope
 * All error responses MUST follow this structure
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: ApiErrorCode;
    details?: unknown;
  };
  meta?: ApiResponseMeta;
}

/**
 * Structured API success response envelope
 * All success responses MUST follow this structure
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiResponseMeta & {
    pagination?: PaginationMeta;
    count?: number;
  };
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Legacy error response format (for backward compatibility during migration)
 * @deprecated Use ApiErrorResponse instead
 */
export interface LegacyApiErrorResponse {
  success: false;
  error: string;
  code: ApiErrorCode;
  details?: unknown;
  requestId?: string;
}

// ============================================================================
// Request ID Generation
// ============================================================================

/**
 * Generate a request ID for tracking
 */
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================================================
// Structured Logger
// ============================================================================

/**
 * Log levels
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured logger for API routes
 */
export const apiLogger = {
  log(level: LogLevel, route: string, message: string, data?: Record<string, unknown>) {
    // Only log in development or for warn/error levels
    if (process.env.NODE_ENV !== 'development' && level !== 'warn' && level !== 'error') {
      return;
    }

    const logData = {
      timestamp: new Date().toISOString(),
      level,
      route,
      message,
      ...data,
    };

    switch (level) {
      case 'debug':
        console.debug(JSON.stringify(logData));
        break;
      case 'info':
        console.info(JSON.stringify(logData));
        break;
      case 'warn':
        console.warn(JSON.stringify(logData));
        break;
      case 'error':
        console.error(JSON.stringify(logData));
        break;
    }
  },

  debug(route: string, message: string, data?: Record<string, unknown>) {
    this.log('debug', route, message, data);
  },

  info(route: string, message: string, data?: Record<string, unknown>) {
    this.log('info', route, message, data);
  },

  warn(route: string, message: string, data?: Record<string, unknown>) {
    this.log('warn', route, message, data);
  },

  error(route: string, message: string, error?: unknown, data?: Record<string, unknown>) {
    const errorInfo =
      error instanceof Error
        ? { errorMessage: error.message, errorName: error.name }
        : { errorMessage: String(error) };

    this.log('error', route, message, { ...errorInfo, ...data });
  },
};
