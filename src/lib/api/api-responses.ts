/**
 * API Response Helper Functions
 *
 * Both legacy (flat format) and standard (envelope) response helpers,
 * plus error handling and request context creation.
 *
 * Imports from: api-errors, api-types
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { formatValidationErrors } from './validation';
import { ApiError } from './api-errors';
import type { ApiErrorCode } from './api-errors';
import { apiLogger, generateRequestId } from './api-types';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  LegacyApiErrorResponse,
  PaginationMeta,
} from './api-types';

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
