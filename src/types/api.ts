/**
 * Flat API response types (legacy format).
 *
 * @deprecated For new routes, use the structured envelope types from `@/lib/api/response`:
 *   - `apiSuccess<T>(data)` → `{ success: true; data: T }`
 *   - `apiError(message, code, status)` → `{ success: false; error: { message, code } }`
 *
 * These flat types are kept for existing routes that return `{ success: true, ...data }`.
 */

export type ApiSuccessResponse<T> = { success: true } & T;
export type ApiErrorResponse = { success: false; error: string };
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
