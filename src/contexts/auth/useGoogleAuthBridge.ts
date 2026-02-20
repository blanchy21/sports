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
 */
export function useGoogleAuthBridge({
  login,
  isAuthenticated,
  hasMounted,
}: UseGoogleAuthBridgeOptions) {
  const attempted = useRef(false);

  useEffect(() => {
    if (!hasMounted || isAuthenticated || attempted.current) return;
    attempted.current = true;

    getSession()
      .then((session) => {
        if (!session?.user?.id) return;

        const { id, email, displayName, avatarUrl } = session.user;
        const { hiveUsername, keysDownloaded } = session.user as {
          hiveUsername?: string;
          keysDownloaded?: boolean;
        };

        const user: User = {
          id,
          username: email ?? id,
          displayName: displayName ?? email ?? id,
          avatar: avatarUrl,
          isHiveAuth: false,
          hiveUsername,
          keysDownloaded,
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
      });
  }, [hasMounted, isAuthenticated, login]);
}
