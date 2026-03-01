/**
 * Structured API Error Classes
 *
 * Leaf dependency — imports nothing from sibling files.
 */

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
