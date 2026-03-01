/**
 * API Response Utilities — Barrel Re-export
 *
 * All 78+ consumer files import from this path.
 * The actual implementation is split into focused modules:
 *
 * - api-errors.ts    — Error classes (ApiError, ValidationError, etc.)
 * - api-types.ts     — Response envelope types, logger, request ID generation
 * - api-responses.ts — Response helper functions (legacy + standard)
 * - api-handler.ts   — createApiHandler wrapper
 */

export * from './api-errors';
export * from './api-types';
export * from './api-responses';
export * from './api-handler';
