import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { Notification } from './types';

const NOTIFICATION_POLL_INTERVAL = 30000;
const NOTIFICATION_LAST_CHECK_KEY = 'sportsblock-notifications-last-check';

const notificationsDebugEnabled =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_DEBUG === 'true' || process.env.NODE_ENV === 'development';

const debugLog = (...args: unknown[]) => {
  if (notificationsDebugEnabled) console.debug('[HiveNotifications]', ...args);
};

export function useHiveNotifications(
  username: string | null | undefined,
  isClient: boolean,
  isSoftUser: boolean,
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>,
  setIsRealtimeActive: (active: boolean) => void
) {
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  const fetchHiveNotifications = useCallback(async (user: string, since?: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];

    try {
      const params = new URLSearchParams({ username: user, limit: '50' });
      if (since) params.set('since', since);

      const response = await fetch(`/api/hive/notifications?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success && Array.isArray(data.notifications)) {
        return data.notifications as Array<{
          id: string;
          type: 'vote' | 'comment' | 'mention' | 'transfer' | 'reblog';
          title: string;
          message: string;
          timestamp: string;
          data: Record<string, unknown>;
        }>;
      }
      return [];
    } catch (error) {
      const isNetworkError = error instanceof TypeError && /failed to fetch/i.test(error.message);
      if (!isNetworkError) {
        logger.error('Error fetching Hive notifications', 'useHiveNotifications', error);
      }
      return [];
    }
  }, []);

  useEffect(() => {
    if (!isClient || !username || isSoftUser) {
      if (!isSoftUser) setIsRealtimeActive(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const lastCheckKey = `${NOTIFICATION_LAST_CHECK_KEY}:${username}`;
    lastCheckRef.current = localStorage.getItem(lastCheckKey);

    const poll = async () => {
      debugLog('Polling...', { username, since: lastCheckRef.current });

      const newNotifications = await fetchHiveNotifications(
        username,
        lastCheckRef.current || undefined
      );

      if (newNotifications.length > 0) {
        debugLog('Found:', newNotifications.length);

        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const uniqueNew = newNotifications
            .filter((n) => !existingIds.has(n.id))
            .map((n) => ({
              ...n,
              type: n.type as Notification['type'],
              timestamp: new Date(n.timestamp),
              read: false,
              source: 'hive' as const,
            }));
          if (uniqueNew.length === 0) return prev;
          return [...uniqueNew, ...prev].slice(0, 100);
        });
      }

      const now = new Date().toISOString();
      lastCheckRef.current = now;
      localStorage.setItem(lastCheckKey, now);
    };

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      poll();
    }
    setIsRealtimeActive(true);

    if (!pollingRef.current) {
      pollingRef.current = setInterval(poll, NOTIFICATION_POLL_INTERVAL);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [
    isClient,
    username,
    isSoftUser,
    fetchHiveNotifications,
    setNotifications,
    setIsRealtimeActive,
  ]);
}
