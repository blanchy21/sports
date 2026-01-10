/**
 * Result Types - Discriminated Union Pattern
 *
 * Provides type-safe error handling using discriminated unions.
 * This pattern ensures that success/failure states are properly
 * handled at compile time, preventing runtime errors.
 */

/**
 * Error codes for API operations
 */
export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'CIRCUIT_OPEN'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Structured API error with metadata
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: unknown;
}

/**
 * Metadata for successful responses
 */
export interface ApiMeta {
  cached?: boolean;
  stale?: boolean;
  staleAge?: number;
  nodeUrl?: string;
  duration?: number;
}

/**
 * Basic Result type - discriminated union for any operation
 */
export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

/**
 * API-specific Result type with metadata and stale data support
 */
export type ApiResult<T> =
  | { ok: true; data: T; meta?: ApiMeta }
  | { ok: false; error: ApiError; staleData?: T };

// ============================================================================
// Constructor Functions
// ============================================================================

/**
 * Create a successful Result
 */
export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

/**
 * Create a failed Result
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Create a successful ApiResult with optional metadata
 */
export function apiOk<T>(data: T, meta?: ApiMeta): ApiResult<T> {
  return { ok: true, data, meta };
}

/**
 * Create a failed ApiResult with optional stale data
 */
export function apiErr<T>(error: ApiError, staleData?: T): ApiResult<T> {
  return { ok: false, error, staleData };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if Result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; data: T } {
  return result.ok === true;
}

/**
 * Type guard to check if Result is failed
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

/**
 * Type guard to check if ApiResult is successful
 */
export function isApiOk<T>(result: ApiResult<T>): result is { ok: true; data: T; meta?: ApiMeta } {
  return result.ok === true;
}

/**
 * Type guard to check if ApiResult is failed
 */
export function isApiErr<T>(result: ApiResult<T>): result is { ok: false; error: ApiError; staleData?: T } {
  return result.ok === false;
}

// ============================================================================
// Unwrap Functions
// ============================================================================

/**
 * Unwrap a successful Result or throw the error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data;
  }
  throw result.error;
}

/**
 * Unwrap a successful Result or return a fallback value
 */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  if (isOk(result)) {
    return result.data;
  }
  return fallback;
}

/**
 * Unwrap a successful Result or compute a fallback value
 */
export function unwrapOrElse<T, E>(result: Result<T, E>, fallbackFn: (error: E) => T): T {
  if (isOk(result)) {
    return result.data;
  }
  return fallbackFn(result.error);
}

/**
 * Unwrap an ApiResult, preferring stale data over throwing
 */
export function unwrapApi<T>(result: ApiResult<T>): T {
  if (isApiOk(result)) {
    return result.data;
  }
  if (result.staleData !== undefined) {
    return result.staleData;
  }
  throw new Error(result.error.message);
}

/**
 * Unwrap an ApiResult or return a fallback
 */
export function unwrapApiOr<T>(result: ApiResult<T>, fallback: T): T {
  if (isApiOk(result)) {
    return result.data;
  }
  if (result.staleData !== undefined) {
    return result.staleData;
  }
  return fallback;
}

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Map over a successful Result
 */
export function map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * Map over a failed Result
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain Results (flatMap)
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.data);
  }
  return result;
}

// ============================================================================
// Async Wrappers
// ============================================================================

/**
 * Wrap an async function to return a Result
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMapper?: (e: unknown) => Error
): Promise<Result<T, Error>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (e) {
    const error = errorMapper
      ? errorMapper(e)
      : e instanceof Error
        ? e
        : new Error(String(e));
    return err(error);
  }
}

/**
 * Wrap an async function to return an ApiResult
 */
export async function tryCatchApi<T>(
  fn: () => Promise<T>,
  errorMapper?: (e: unknown) => ApiError
): Promise<ApiResult<T>> {
  try {
    const data = await fn();
    return apiOk(data);
  } catch (e) {
    const error = errorMapper
      ? errorMapper(e)
      : mapToApiError(e);
    return apiErr(error);
  }
}

/**
 * Map unknown errors to ApiError
 */
export function mapToApiError(e: unknown): ApiError {
  if (e instanceof Error) {
    const message = e.message.toLowerCase();

    // Detect error type from message
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        code: 'TIMEOUT',
        message: e.message,
        retryable: true,
      };
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        code: 'RATE_LIMITED',
        message: e.message,
        retryable: true,
      };
    }
    if (message.includes('circuit') || message.includes('breaker')) {
      return {
        code: 'CIRCUIT_OPEN',
        message: e.message,
        retryable: true,
      };
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        code: 'NETWORK_ERROR',
        message: e.message,
        retryable: true,
      };
    }
    if (message.includes('not found') || message.includes('404')) {
      return {
        code: 'NOT_FOUND',
        message: e.message,
        retryable: false,
      };
    }
    if (message.includes('unauthorized') || message.includes('401') || message.includes('403')) {
      return {
        code: 'UNAUTHORIZED',
        message: e.message,
        retryable: false,
      };
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return {
        code: 'VALIDATION_ERROR',
        message: e.message,
        retryable: false,
      };
    }

    return {
      code: 'INTERNAL_ERROR',
      message: e.message,
      retryable: false,
      details: e.stack,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(e),
    retryable: false,
  };
}

// ============================================================================
// Legacy Compatibility
// ============================================================================

/**
 * Convert ApiResult to legacy format for backward compatibility
 * Use this during migration to avoid breaking existing code
 */
export function toLegacy<T>(result: ApiResult<T>): {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
} {
  if (isApiOk(result)) {
    return {
      success: true,
      data: result.data,
    };
  }
  return {
    success: false,
    data: result.staleData,
    error: result.error.message,
    details: result.error.details,
  };
}

/**
 * Convert legacy format to ApiResult
 * Use this to wrap legacy functions
 */
export function fromLegacy<T>(legacy: {
  success: boolean;
  data?: T;
  error?: string;
}): ApiResult<T> {
  if (legacy.success && legacy.data !== undefined) {
    return apiOk(legacy.data);
  }
  return apiErr({
    code: 'INTERNAL_ERROR',
    message: legacy.error || 'Unknown error',
    retryable: false,
  });
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract the data type from a Result
 */
export type UnwrapResult<R> = R extends Result<infer T, unknown> ? T : never;

/**
 * Extract the error type from a Result
 */
export type UnwrapError<R> = R extends Result<unknown, infer E> ? E : never;

/**
 * Extract the data type from an ApiResult
 */
export type UnwrapApiResult<R> = R extends ApiResult<infer T> ? T : never;
