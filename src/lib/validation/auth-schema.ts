/**
 * Auth State Validation Schema
 *
 * Validates localStorage auth state to prevent corrupted/malicious data
 * from causing runtime errors.
 */

import { z } from 'zod';

/**
 * User schema for validation
 */
const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().optional(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  isHiveAuth: z.boolean().optional(),
  hiveUsername: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
  // Hive-specific fields
  reputation: z.number().optional(),
  reputationFormatted: z.string().optional(),
  liquidHiveBalance: z.string().optional(),
  liquidHbdBalance: z.string().optional(),
  savingsHiveBalance: z.string().optional(),
  savingsHbdBalance: z.string().optional(),
  hiveBalance: z.string().optional(),
  hbdBalance: z.string().optional(),
  hivePower: z.string().optional(),
  rcPercentage: z.number().optional(),
  savingsApr: z.number().optional(),
  pendingWithdrawals: z.array(z.unknown()).optional(),
  hiveProfile: z.record(z.string(), z.unknown()).optional(),
  hiveStats: z.record(z.string(), z.unknown()).optional(),
}).passthrough(); // Allow additional fields

/**
 * Auth type enum
 */
const authTypeSchema = z.enum(['guest', 'soft', 'hive']);

/**
 * Hive user schema
 */
const hiveUserSchema = z.object({
  username: z.string(),
  isAuthenticated: z.boolean().optional(),
  provider: z.string().optional(),
  sessionId: z.string().optional(),
  aiohaUserId: z.string().optional(),
  account: z.record(z.string(), z.unknown()).optional(),
}).passthrough().nullable();

/**
 * Complete auth state schema
 */
export const authStateSchema = z.object({
  user: userSchema.nullable(),
  authType: authTypeSchema,
  hiveUser: hiveUserSchema.optional(),
});

/**
 * Type for validated auth state
 */
export type ValidatedAuthState = z.infer<typeof authStateSchema>;

/**
 * Parse and validate auth state from localStorage
 *
 * @param json - Raw JSON string from localStorage
 * @returns Validated auth state or null if invalid
 */
export function parseAuthState(json: string): ValidatedAuthState | null {
  try {
    const parsed = JSON.parse(json);
    const result = authStateSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    console.warn('Auth state validation failed:', result.error.issues);
    return null;
  } catch (error) {
    console.error('Failed to parse auth state JSON:', error);
    return null;
  }
}

/**
 * Validate auth state object (already parsed)
 *
 * @param state - Parsed state object
 * @returns true if valid
 */
export function isValidAuthState(state: unknown): state is ValidatedAuthState {
  return authStateSchema.safeParse(state).success;
}
