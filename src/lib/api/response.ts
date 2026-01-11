/**
 * API Response Utilities
 *
 * Standardized response helpers for API routes.
 * Provides consistent error handling and response formatting.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { formatValidationErrors } from './validation';

/**
 * Error codes for API responses
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

/**
 * Structured API error
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: ApiErrorCode;
  details?: unknown;
  requestId?: string;
}

/**
 * Structured API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data?: T;
  meta?: {
    cached?: boolean;
    stale?: boolean;
    count?: number;
  };
}

/**
 * Generate a request ID for tracking
 */
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

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
    const errorInfo = error instanceof Error
      ? { errorMessage: error.message, errorName: error.name }
      : { errorMessage: String(error) };

    this.log('error', route, message, { ...errorInfo, ...data });
  },
};

/**
 * Create a validation error response (400)
 */
export function validationError(
  error: ZodError | string,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const message = error instanceof ZodError
    ? formatValidationErrors(error)
    : error;

  const details = error instanceof ZodError ? error.issues : undefined;

  return NextResponse.json(
    {
      success: false as const,
      error: message,
      code: 'VALIDATION_ERROR' as const,
      details,
      requestId,
    },
    { status: 400 }
  );
}

/**
 * Create a not found error response (404)
 */
export function notFoundError(
  message: string,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      code: 'NOT_FOUND' as const,
      requestId,
    },
    { status: 404 }
  );
}

/**
 * Create an unauthorized error response (401)
 */
export function unauthorizedError(
  message = 'Authentication required',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      code: 'UNAUTHORIZED' as const,
      requestId,
    },
    { status: 401 }
  );
}

/**
 * Create a forbidden error response (403)
 */
export function forbiddenError(
  message: string,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      code: 'FORBIDDEN' as const,
      requestId,
    },
    { status: 403 }
  );
}

/**
 * Create a rate limited error response (429)
 */
export function rateLimitedError(
  message = 'Too many requests',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      code: 'RATE_LIMITED' as const,
      requestId,
    },
    { status: 429 }
  );
}

/**
 * Create a timeout error response (504)
 */
export function timeoutError(
  message = 'Request timeout',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      code: 'TIMEOUT' as const,
      requestId,
    },
    { status: 504 }
  );
}

/**
 * Create an upstream error response (502)
 */
export function upstreamError(
  message: string,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      code: 'UPSTREAM_ERROR' as const,
      requestId,
    },
    { status: 502 }
  );
}

/**
 * Create an internal error response (500)
 */
export function internalError(
  message = 'Internal server error',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      code: 'INTERNAL_ERROR' as const,
      requestId,
    },
    { status: 500 }
  );
}

/**
 * Create a success response with data
 */
export function successResponse<T>(
  data: T,
  meta?: ApiSuccessResponse<T>['meta']
): NextResponse {
  return NextResponse.json({
    success: true,
    ...data,
    ...(meta && { meta }),
  });
}

/**
 * Handle API route errors consistently
 */
export function handleApiError(
  route: string,
  error: unknown,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  // Log the error
  apiLogger.error(route, 'Request failed', error, { requestId });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return validationError(error, requestId);
  }

  // Handle known error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('aborted')) {
      return timeoutError('Request timed out', requestId);
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return rateLimitedError('Rate limit exceeded', requestId);
    }

    if (message.includes('not found') || message.includes('404')) {
      return notFoundError(error.message, requestId);
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return unauthorizedError(error.message, requestId);
    }

    // Upstream/blockchain errors
    if (
      message.includes('hive') ||
      message.includes('blockchain') ||
      message.includes('node')
    ) {
      return upstreamError(error.message, requestId);
    }
  }

  // Default to internal error
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  return internalError(errorMessage, requestId);
}

/**
 * Create a request context with ID and logger
 */
export function createRequestContext(route: string) {
  const requestId = generateRequestId();

  return {
    requestId,
    log: {
      debug: (message: string, data?: Record<string, unknown>) =>
        apiLogger.debug(route, message, { ...data, requestId }),
      info: (message: string, data?: Record<string, unknown>) =>
        apiLogger.info(route, message, { ...data, requestId }),
      warn: (message: string, data?: Record<string, unknown>) =>
        apiLogger.warn(route, message, { ...data, requestId }),
      error: (message: string, error?: unknown, data?: Record<string, unknown>) =>
        apiLogger.error(route, message, error, { ...data, requestId }),
    },
    handleError: (error: unknown) => handleApiError(route, error, requestId),
  };
}
