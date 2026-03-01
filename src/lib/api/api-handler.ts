/**
 * API Route Handler Wrapper
 *
 * Provides `createApiHandler` — a wrapper that adds automatic error handling,
 * request tracking, and structured logging to API route handlers.
 *
 * Imports from: api-types, api-responses
 */

import { NextResponse } from 'next/server';
import { apiLogger, generateRequestId } from './api-types';
import type { ApiErrorResponse, ApiSuccessResponse } from './api-types';
import { handleApiError } from './api-responses';

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
 *
 * Available error classes (throw in handlers):
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
