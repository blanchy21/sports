import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { Notification } from './types';

const NOTIFICATION_POLL_INTERVAL = 30000;
const MAX_POLL_INTERVAL = 5 * 60 * 1000; // 5 min max backoff
const NOTIFICATION_LAST_CHECK_KEY = 'sportsblock-notifications-last-check';

const notificationsDebugEnabled =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_DEBUG === 'true' || process.env.NODE_ENV === 'development';

const debugLog = (...args: unknown[]) => {
  if (notificationsDebugEnabled) console.debug('[HiveNotifications]', ...args);
};

type HiveNotification = {
  id: string;
  type: 'vote' | 'comment' | 'mention' | 'transfer' | 'reblog';
  title: string;
  message: string;
  timestamp: string;
  data: Record<string, unknown>;
};

export function useHiveNotifications(
  username: string | null | undefined,
  isClient: boolean,
  isSoftUser: boolean,
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>,
  setIsRealtimeActive: (active: boolean) => void
) {
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);

  // Returns null on error so caller can distinguish from empty success
  const fetchHiveNotifications = useCallback(
    async (user: string, since?: string): Promise<HiveNotification[] | null> => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

      try {
        const params = new URLSearchParams({ username: user, limit: '50' });
        if (since) params.set('since', since);

        const response = await fetch(`/api/hive/notifications?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.success && Array.isArray(data.notifications)) {
          return data.notifications as HiveNotification[];
        }
        return [];
      } catch (error) {
        const isNetworkError = error instanceof TypeError && /failed to fetch/i.test(error.message);
        if (!isNetworkError) {
          logger.error('Error fetching Hive notifications', 'useHiveNotifications', error);
        }
        return null;
      }
    },
    []
  );

  useEffect(() => {
    if (!isClient || !username || isSoftUser) {
      if (!isSoftUser) setIsRealtimeActive(false);
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const lastCheckKey = `${NOTIFICATION_LAST_CHECK_KEY}:${username}`;
    lastCheckRef.current = localStorage.getItem(lastCheckKey);

    const schedulePoll = () => {
      const interval = Math.min(
        NOTIFICATION_POLL_INTERVAL * Math.pow(2, consecutiveFailuresRef.current),
        MAX_POLL_INTERVAL
      );
      pollingRef.current = setTimeout(poll, interval);
    };

    const poll = async () => {
      debugLog('Polling...', { username, since: lastCheckRef.current });

      const result = await fetchHiveNotifications(username, lastCheckRef.current || undefined);

      if (result === null) {
        // Fetch failed — increase backoff
        consecutiveFailuresRef.current = Math.min(consecutiveFailuresRef.current + 1, 5);
        schedulePoll();
        return;
      }

      // Success — reset backoff
      consecutiveFailuresRef.current = 0;

      if (result.length > 0) {
        debugLog('Found:', result.length);

        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const uniqueNew = result
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

      schedulePoll();
    };

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      poll();
    } else {
      schedulePoll();
    }
    setIsRealtimeActive(true);

    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
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
