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
  | 'INTERNAL_ERROR'
  | 'HIVE_ERROR'
  | 'AUTH_ERROR';

// ============================================================================
// Structured Error Classes
// ============================================================================

/**
 * Base API error class with error code
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(message: string, code: ApiErrorCode, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Authentication error (401)
 *
 * Preferred class for new routes using `createApiHandler` + `throw`.
 * Returns error code `AUTH_ERROR`.
 */
export class AuthError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

/**
 * Unauthorized error (401)
 *
 * Returns error code `UNAUTHORIZED`. Kept as a distinct class because
 * the legacy `unauthorizedError()` helper and some clients check for
 * the `UNAUTHORIZED` code. Prefer `AuthError` for new code.
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message: string) {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMITED', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Timeout error (504)
 */
export class TimeoutError extends ApiError {
  constructor(message = 'Request timeout') {
    super(message, 'TIMEOUT', 504);
    this.name = 'TimeoutError';
  }
}

/**
 * Upstream/external service error (502)
 */
export class UpstreamError extends ApiError {
  constructor(message: string) {
    super(message, 'UPSTREAM_ERROR', 502);
    this.name = 'UpstreamError';
  }
}

/**
 * Hive blockchain specific error (502)
 */
export class HiveError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 'HIVE_ERROR', 502, details);
    this.name = 'HiveError';
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 'INTERNAL_ERROR', 500);
    this.name = 'InternalError';
  }
}

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
    const errorInfo =
      error instanceof Error
        ? { errorMessage: error.message, errorName: error.name }
        : { errorMessage: String(error) };

    this.log('error', route, message, { ...errorInfo, ...data });
  },
};

// ============================================================================
// Legacy Error Response Functions (for backward compatibility)
// These return the flat error format used by existing routes
// ============================================================================

/**
 * Create a validation error response (400)
 * @deprecated Use apiError() for new routes
 */
export function validationError(
  error: ZodError | string,
  requestId?: string
): NextResponse<LegacyApiErrorResponse> {
  const message = error instanceof ZodError ? formatValidationErrors(error) : error;

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
 * @deprecated Use apiError() for new routes
 */
export function notFoundError(
  message: string,
  requestId?: string
): NextResponse<LegacyApiErrorResponse> {
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
 * @deprecated Use apiError() for new routes
 */
export function unauthorizedError(
  message = 'Authentication required',
  requestId?: string
): NextResponse<LegacyApiErrorResponse> {
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
 * @deprecated Use apiError() for new routes
 */
export function forbiddenError(
  message: string,
  requestId?: string
): NextResponse<LegacyApiErrorResponse> {
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
 * @deprecated Use apiError() for new routes
 */
export function rateLimitedError(
  message = 'Too many requests',
  requestId?: string
): NextResponse<LegacyApiErrorResponse> {
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
 * @deprecated Use apiError() for new routes
 */
export function timeoutError(
  message = 'Request timeout',
  requestId?: string
): NextResponse<LegacyApiErrorResponse> {
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
 * @deprecated Use apiError() for new routes
 */
export function upstreamError(
  message: string,
  requestId?: string
): NextResponse<LegacyApiErrorResponse> {
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
 * @deprecated Use apiError() for new routes
 */
export function internalError(
  message = 'Internal server error',
  requestId?: string
): NextResponse<LegacyApiErrorResponse> {
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
 * Create a success response with data (legacy - spreads data at root)
 * @deprecated Use apiSuccess() for standard envelope responses
 */
export function successResponse<T>(data: T, meta?: ApiSuccessResponse<T>['meta']): NextResponse {
  return NextResponse.json({
    success: true,
    ...data,
    ...(meta && { meta }),
  });
}

// ============================================================================
// Standard API Response Functions (New)
// ============================================================================

/**
 * Create a standardized success response with data wrapped in envelope
 *
 * @example
 * // Simple response
 * return apiSuccess({ posts: [...], total: 10 });
 *
 * // With metadata
 * return apiSuccess(
 *   { posts: [...] },
 *   { pagination: { total: 100, page: 1, limit: 20, hasMore: true } }
 * );
 */
export function apiSuccess<T>(
  data: T,
  options?: {
    meta?: ApiSuccessResponse<T>['meta'];
    status?: number;
    headers?: HeadersInit;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (options?.meta) {
    response.meta = {
      ...options.meta,
      timestamp: new Date().toISOString(),
    };
  }

  return NextResponse.json(response, {
    status: options?.status ?? 200,
    headers: options?.headers,
  });
}

/**
 * Create a standardized error response
 *
 * @example
 * return apiError('User not found', 'NOT_FOUND', 404);
 */
export function apiError(
  message: string,
  code: ApiErrorCode,
  status: number,
  options?: {
    details?: unknown;
    requestId?: string;
    headers?: HeadersInit;
  }
): NextResponse<ApiErrorResponse> {
  const errorObj: ApiErrorResponse['error'] = {
    message,
    code,
  };

  if (options?.details !== undefined) {
    errorObj.details = options.details;
  }

  const response: ApiErrorResponse = {
    success: false,
    error: errorObj,
    meta: {
      requestId: options?.requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, {
    status,
    headers: options?.headers,
  });
}

/**
 * Create a paginated success response
 *
 * @example
 * return apiPaginated(posts, { total: 100, page: 1, limit: 20 });
 */
export function apiPaginated<T>(
  data: T,
  pagination: Omit<PaginationMeta, 'hasMore'>,
  options?: {
    requestId?: string;
    cached?: boolean;
  }
): NextResponse<ApiSuccessResponse<T>> {
  const hasMore = pagination.page * pagination.limit < pagination.total;

  return apiSuccess(data, {
    meta: {
      requestId: options?.requestId,
      cached: options?.cached,
      pagination: {
        ...pagination,
        hasMore,
      },
    },
  });
}

/**
 * Handle API route errors consistently
 *
 * Priority:
 * 1. Structured ApiError subclasses (instanceof checks)
 * 2. ZodError for validation
 * 3. Native Error types (AbortError, TimeoutError)
 * 4. String matching fallback for legacy errors
 * 5. Default to internal error
 */
export function handleApiError(
  route: string,
  error: unknown,
  requestId?: string
): NextResponse<LegacyApiErrorResponse> {
  // Enhanced error logging with stack traces
  const errorDetails =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        }
      : {
          type: typeof error,
          value: String(error),
        };

  console.error(
    `[API Error] ${route}`,
    JSON.stringify(
      {
        requestId,
        timestamp: new Date().toISOString(),
        error: errorDetails,
      },
      null,
      2
    )
  );

  // Log the error using apiLogger as well
  apiLogger.error(route, 'Request failed', error, { requestId });

  // 1. Handle structured API errors (preferred)
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false as const,
        error: error.message,
        code: error.code,
        details: error.details,
        requestId,
      },
      { status: error.statusCode }
    );
  }

  // 2. Handle Zod validation errors
  if (error instanceof ZodError) {
    return validationError(error, requestId);
  }

  // 3. Handle native Error types
  if (error instanceof Error) {
    // AbortError from fetch cancellation
    if (error.name === 'AbortError') {
      return timeoutError('Request was cancelled', requestId);
    }

    // Native TimeoutError
    if (error.name === 'TimeoutError') {
      return timeoutError('Request timed out', requestId);
    }

    // 4. String matching fallback for legacy errors
    // (This allows gradual migration to structured errors)
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
    if (message.includes('hive') || message.includes('blockchain') || message.includes('node')) {
      return upstreamError('Blockchain service temporarily unavailable', requestId);
    }
  }

  // 5. Default to internal error — don't leak internal details in production
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = isProduction
    ? 'An internal error occurred'
    : error instanceof Error
      ? error.message
      : 'Unknown error';
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

// ============================================================================
// API Route Handler Wrapper
// ============================================================================

/**
 * Context passed to API route handlers
 */
export interface ApiHandlerContext {
  /** Unique request ID for tracking */
  requestId: string;
  /** Structured logger */
  log: {
    debug: (message: string, data?: Record<string, unknown>) => void;
    info: (message: string, data?: Record<string, unknown>) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    error: (message: string, error?: unknown, data?: Record<string, unknown>) => void;
  };
}

/**
 * Type for API route handler functions
 */
export type ApiRouteHandler<T = unknown> = (
  request: Request,
  context: ApiHandlerContext
) => Promise<NextResponse<ApiSuccessResponse<T>> | NextResponse<ApiErrorResponse>>;

/**
 * Permissive handler type for routes that return domain-specific response shapes
 * (not wrapped in ApiSuccessResponse envelope). Use during migration of legacy routes
 * that need createApiHandler's error handling + logging but keep their existing response shapes.
 */
export type LegacyApiRouteHandler = (
  request: Request,
  context: ApiHandlerContext
) => Promise<NextResponse>;

/**
 * Create a wrapped API route handler with automatic error handling
 *
 * This wrapper:
 * - Generates a unique request ID for tracking
 * - Provides a structured logger
 * - Catches all errors and returns standardized error responses
 * - Enforces response envelope structure
 *
 * @example
 * // In your route.ts file:
 * export const GET = createApiHandler('/api/posts', async (request, ctx) => {
 *   ctx.log.info('Fetching posts');
 *
 *   const posts = await fetchPosts();
 *
 *   return apiSuccess({ posts, total: posts.length });
 * });
 */
export function createApiHandler(
  route: string,
  handler: LegacyApiRouteHandler
): (request: Request) => Promise<NextResponse>;
export function createApiHandler<T = unknown>(
  route: string,
  handler: ApiRouteHandler<T>
): (request: Request) => Promise<NextResponse>;
export function createApiHandler<T = unknown>(
  route: string,
  handler: ApiRouteHandler<T> | LegacyApiRouteHandler
): (request: Request) => Promise<NextResponse> {
  return async (request: Request): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    const ctx: ApiHandlerContext = {
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
    };

    try {
      ctx.log.debug('Request started', { method: request.method });

      const response = await handler(request, ctx);

      const duration = Date.now() - startTime;
      ctx.log.debug('Request completed', { duration, status: response.status });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      ctx.log.error('Request failed', error, { duration });

      return handleApiError(route, error, requestId);
    }
  };
}

/**
 * Helper to throw structured API errors in handlers
 *
 * @example
 * if (!user) {
 *   throw new NotFoundError('User not found');
 * }
 *
 * Available error classes:
 * - ApiError (base class)
 * - ValidationError (400)
 * - NotFoundError (404)
 * - AuthError / UnauthorizedError (401)
 * - ForbiddenError (403)
 * - RateLimitError (429)
 * - TimeoutError (504)
 * - UpstreamError (502)
 * - HiveError (502)
 * - InternalError (500)
 */
