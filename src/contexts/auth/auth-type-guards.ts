import type { UserAccountData } from '@/lib/shared/types';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for UserAccountData
 * Validates that the object has the required shape for account data
 */
export function isUserAccountData(data: unknown): data is UserAccountData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.username === 'string' &&
    typeof obj.reputation === 'number' &&
    typeof obj.liquidHiveBalance === 'number' &&
    typeof obj.liquidHbdBalance === 'number' &&
    typeof obj.hivePower === 'number' &&
    typeof obj.resourceCredits === 'number' &&
    obj.profile !== null &&
    typeof obj.profile === 'object' &&
    obj.stats !== null &&
    typeof obj.stats === 'object'
  );
}

/**
 * Type guard for checking if an API response contains valid account data
 */
export function hasValidAccountData(
  result: unknown
): result is { success: true; account: UserAccountData } {
  if (!result || typeof result !== 'object') return false;
  const obj = result as Record<string, unknown>;
  return obj.success === true && isUserAccountData(obj.account);
}
