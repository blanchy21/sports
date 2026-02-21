/**
 * Shared Hive operation types used by both client and server code.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HiveOperation = [string, Record<string, any>];

export type KeyType = 'posting' | 'active';
