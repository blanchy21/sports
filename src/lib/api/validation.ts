/**
 * API Validation Schemas
 *
 * Centralized Zod schemas for validating API request parameters.
 * Provides type-safe validation with clear error messages.
 */

import { z } from 'zod';

/**
 * Hive username validation
 * - 3-16 characters
 * - Lowercase letters, numbers, dots, and hyphens
 * - Must start with a letter
 * - Cannot end with a dot or hyphen
 */
export const hiveUsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(16, 'Username must be at most 16 characters')
  .regex(/^[a-z][a-z0-9.-]*[a-z0-9]$|^[a-z]$/, 'Invalid Hive username format')
  .transform((val) => val.toLowerCase());

/**
 * Permlink validation
 * - Letters (upper and lowercase), numbers, and hyphens
 * - Max 256 characters
 * Note: Hive permlinks are lowercase, but soft permlinks may contain uppercase
 */
export const permlinkSchema = z
  .string()
  .min(1, 'Permlink is required')
  .max(256, 'Permlink too long')
  .regex(/^[a-zA-Z0-9-]+$/, 'Invalid permlink format');

/**
 * Pagination limit with bounds
 */
export const limitSchema = z
  .string()
  .optional()
  .default('20')
  .transform((val) => parseInt(val, 10))
  .pipe(z.number().int().min(1).max(100));

/**
 * Extended limit for history (up to 1000)
 */
export const historyLimitSchema = z
  .string()
  .optional()
  .default('500')
  .transform((val) => parseInt(val, 10))
  .pipe(z.number().int().min(1).max(1000));

/**
 * Sort options for posts
 */
export const postSortSchema = z.enum(['created', 'trending', 'payout', 'votes']);

/**
 * Cursor for pagination (ISO date string or permlink)
 */
export const cursorSchema = z.string().max(256, 'Cursor too long').optional();

/**
 * Sport category filter
 */
export const sportCategorySchema = z.string().max(50, 'Category too long').optional();

/**
 * Tag filter
 */
export const tagSchema = z
  .string()
  .max(100, 'Tag too long')
  .regex(/^[a-z0-9-]+$/, 'Invalid tag format')
  .optional();

// ============================================
// Composite Schemas for API Routes
// ============================================

/**
 * GET /api/hive/posts query params
 */
export const postsQuerySchema = z.object({
  username: hiveUsernameSchema.optional(),
  author: hiveUsernameSchema.optional(),
  permlink: permlinkSchema.optional(),
  limit: limitSchema,
  sort: postSortSchema.optional().default('created'),
  sportCategory: sportCategorySchema,
  tag: tagSchema,
  before: cursorSchema,
});

export type PostsQueryParams = z.infer<typeof postsQuerySchema>;

/**
 * GET /api/hive/comments query params
 */
export const commentsQuerySchema = z
  .object({
    author: hiveUsernameSchema.optional(),
    permlink: permlinkSchema.optional(),
    username: hiveUsernameSchema.optional(),
    limit: limitSchema,
  })
  .refine((data) => (data.author && data.permlink) || data.username, {
    message: 'Either author/permlink or username is required',
  });

export type CommentsQueryParams = z.infer<typeof commentsQuerySchema>;

/**
 * GET /api/hive/account/summary query params
 */
export const accountSummaryQuerySchema = z.object({
  username: hiveUsernameSchema,
});

export type AccountSummaryQueryParams = z.infer<typeof accountSummaryQuerySchema>;

/**
 * GET /api/hive/account/history query params
 */
export const accountHistoryQuerySchema = z.object({
  username: hiveUsernameSchema,
  limit: historyLimitSchema,
  start: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(0).optional()),
});

export type AccountHistoryQueryParams = z.infer<typeof accountHistoryQuerySchema>;

/**
 * GET /api/hive/posting query params
 */
export const postingStatusQuerySchema = z.object({
  username: hiveUsernameSchema,
});

export type PostingStatusQueryParams = z.infer<typeof postingStatusQuerySchema>;

/**
 * GET /api/image-proxy query params
 */
export const imageProxyQuerySchema = z.object({
  url: z.string().url('Invalid URL format'),
});

export type ImageProxyQueryParams = z.infer<typeof imageProxyQuerySchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Parse and validate search params using a schema
 */
export function parseSearchParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
) {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return schema.safeParse(params);
}

/**
 * Format Zod errors for API response
 */
export function formatValidationErrors(error: z.ZodError): string {
  return error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(error: z.ZodError): {
  success: false;
  error: string;
  details: z.ZodIssue[];
} {
  return {
    success: false,
    error: formatValidationErrors(error),
    details: error.issues,
  };
}
