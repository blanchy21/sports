import { useEffect, useRef } from 'react';
import { getSession } from 'next-auth/react';
import { AuthType, User } from '@/types';
import { logger } from '@/lib/logger';

interface UseGoogleAuthBridgeOptions {
  login: (user: User, authType: AuthType) => void;
  isAuthenticated: boolean;
  hasMounted: boolean;
}

/**
 * Bridge hook: detects a NextAuth Google session after OAuth redirect
 * and feeds it into AuthContext via login('soft').
 *
 * Runs once per mount — no SessionProvider needed.
 * Uses a ref to track current auth state so the async getSession()
 * callback doesn't override a Hive login that completed in the meantime.
 */
export function useGoogleAuthBridge({
  login,
  isAuthenticated,
  hasMounted,
}: UseGoogleAuthBridgeOptions) {
  const attempted = useRef(false);
  // Track latest auth state via ref so the async callback can check it
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  useEffect(() => {
    if (!hasMounted || isAuthenticated || attempted.current) return;
    attempted.current = true;

    getSession()
      .then((session) => {
        // Re-check current auth state — a Hive login may have completed
        // while getSession() was in-flight
        if (isAuthenticatedRef.current) return;

        if (!session?.user?.id) return;

        const { id, email, displayName, avatarUrl } = session.user;
        const { hiveUsername, keysDownloaded, onboardingCompleted } = session.user as {
          hiveUsername?: string;
          keysDownloaded?: boolean;
          onboardingCompleted?: boolean;
        };

        const user: User = {
          id,
          // NEVER use email as username — it leaks into feed/profile display
          username: hiveUsername ?? displayName ?? id,
          displayName: hiveUsername ?? displayName ?? email ?? id,
          avatar: avatarUrl,
          isHiveAuth: false,
          hiveUsername,
          keysDownloaded,
          onboardingCompleted,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        login(user, 'soft');
        logger.info('Google auth bridge: logged in via NextAuth session', 'useGoogleAuthBridge');
      })
      .catch((err) => {
        logger.error(
          'Google auth bridge: failed to fetch NextAuth session',
          'useGoogleAuthBridge',
          err
        );
        // Allow retry on next mount — session fetch may have failed transiently
        attempted.current = false;
      });
  }, [hasMounted, isAuthenticated, login]);
}
