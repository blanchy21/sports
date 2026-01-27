import { useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { User } from '@/types';
import { HiveAuthUser, UserAccountData } from '@/lib/shared/types';
import { fetchWithRetry } from '@/lib/utils/api-retry';
import { hasValidAccountData } from './auth-type-guards';

/**
 * Creates a User object with Hive account data merged in
 */
export function createUserWithAccountData(
  baseUser: User,
  accountData: UserAccountData,
  hiveUsername: string,
  existingUser?: User
): User {
  return {
    ...baseUser,
    reputation: accountData.reputation,
    reputationFormatted: accountData.reputationFormatted,
    liquidHiveBalance: accountData.liquidHiveBalance,
    liquidHbdBalance: accountData.liquidHbdBalance,
    savingsHiveBalance: accountData.savingsHiveBalance,
    savingsHbdBalance: accountData.savingsHbdBalance,
    hiveBalance: accountData.hiveBalance,
    hbdBalance: accountData.hbdBalance,
    hivePower: accountData.hivePower,
    rcPercentage: accountData.resourceCredits,
    savingsApr: accountData.savingsApr,
    pendingWithdrawals: accountData.pendingWithdrawals,
    hiveProfile: accountData.profile,
    hiveStats: accountData.stats,
    avatar: accountData.profile.profileImage || existingUser?.avatar,
    displayName: accountData.profile.name || existingUser?.displayName || hiveUsername,
    bio: accountData.profile.about || existingUser?.bio,
    createdAt: accountData.createdAt,
  };
}

export interface ProfileFetchResult {
  accountData: UserAccountData;
  updatedUser: User;
  updatedHiveUser: HiveAuthUser;
}

export interface UseAuthProfileOptions {
  onProfileLoaded: (result: ProfileFetchResult) => void;
  onProfileFailed: () => void;
}

export interface UseAuthProfileReturn {
  /**
   * Fetch profile in background after login. Returns immediately, updates via callbacks.
   */
  fetchProfileInBackground: (username: string, baseUser: User, baseHiveUser: HiveAuthUser) => void;

  /**
   * Fetch profile synchronously and return the result
   */
  fetchProfile: (username: string) => Promise<UserAccountData | null>;

  /**
   * Apply account data to existing user/hiveUser
   */
  applyAccountData: (
    accountData: UserAccountData,
    user: User,
    hiveUser: HiveAuthUser
  ) => { updatedUser: User; updatedHiveUser: HiveAuthUser };

  /**
   * Abort any in-flight profile fetch
   */
  abortFetch: () => void;
}

/**
 * Hook for managing Hive profile fetching with proper abort handling
 */
export function useAuthProfile(options: UseAuthProfileOptions): UseAuthProfileReturn {
  const { onProfileLoaded, onProfileFailed } = options;
  const controllerRef = useRef<AbortController | null>(null);

  const abortFetch = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const fetchProfile = useCallback(async (username: string): Promise<UserAccountData | null> => {
    try {
      const response = await fetchWithRetry(
        `/api/hive/account/summary?username=${encodeURIComponent(username)}`,
        {},
        { maxRetries: 3, initialDelay: 500, maxDelay: 5000 }
      );
      const result = await response.json();

      if (hasValidAccountData(result)) {
        const { account } = result;
        return {
          ...account,
          createdAt: account.createdAt ? new Date(String(account.createdAt)) : new Date(),
          lastPost: account.lastPost ? new Date(String(account.lastPost)) : undefined,
          lastVote: account.lastVote ? new Date(String(account.lastVote)) : undefined,
        };
      }
      return null;
    } catch (error) {
      logger.error('Error fetching Hive account data', 'useAuthProfile', error);
      return null;
    }
  }, []);

  const applyAccountData = useCallback(
    (
      accountData: UserAccountData,
      user: User,
      hiveUser: HiveAuthUser
    ): { updatedUser: User; updatedHiveUser: HiveAuthUser } => {
      const updatedHiveUser: HiveAuthUser = {
        ...hiveUser,
        account: accountData,
      };
      const updatedUser = createUserWithAccountData(user, accountData, hiveUser.username, user);
      return { updatedUser, updatedHiveUser };
    },
    []
  );

  const fetchProfileInBackground = useCallback(
    (username: string, baseUser: User, baseHiveUser: HiveAuthUser) => {
      // Abort any existing fetch
      abortFetch();
      controllerRef.current = new AbortController();
      const controller = controllerRef.current;

      // Use setTimeout to defer to next tick
      setTimeout(async () => {
        try {
          const response = await fetchWithRetry(
            `/api/hive/account/summary?username=${encodeURIComponent(username)}`,
            { signal: controller.signal },
            { maxRetries: 3, initialDelay: 500, maxDelay: 5000 }
          );
          const result = await response.json();

          if (hasValidAccountData(result)) {
            const accountData = result.account;
            const updatedHiveUser: HiveAuthUser = { ...baseHiveUser, account: accountData };
            const updatedUser = createUserWithAccountData(baseUser, accountData, username);

            onProfileLoaded({ accountData, updatedUser, updatedHiveUser });
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
          logger.error('Error fetching Hive account data after retries', 'useAuthProfile', error);
          onProfileFailed();
        }
      }, 0);
    },
    [abortFetch, onProfileLoaded, onProfileFailed]
  );

  return {
    fetchProfileInBackground,
    fetchProfile,
    applyAccountData,
    abortFetch,
  };
}
