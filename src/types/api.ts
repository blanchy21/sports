/**
 * Discriminated union types for API responses.
 *
 * Usage:
 *   return NextResponse.json<ApiResponse<{ posts: Post[] }>>({ success: true, posts });
 *   return NextResponse.json<ApiResponse<{ posts: Post[] }>>({ success: false, error: '...' });
 */

export type ApiSuccessResponse<T> = { success: true } & T;
export type ApiErrorResponse = { success: false; error: string };
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
