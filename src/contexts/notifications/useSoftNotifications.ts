import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { Notification } from './types';

const NOTIFICATION_POLL_INTERVAL = 30000;
const MAX_POLL_INTERVAL = 5 * 60 * 1000; // 5 min max backoff

const notificationsDebugEnabled =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_DEBUG === 'true' || process.env.NODE_ENV === 'development';

const debugLog = (...args: unknown[]) => {
  if (notificationsDebugEnabled) console.debug('[SoftNotifications]', ...args);
};

type SoftNotification = {
  id: string;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  sourceUserId?: string;
  sourceUsername?: string;
  data?: Record<string, unknown>;
};

export function useSoftNotifications(
  userId: string | null | undefined,
  isClient: boolean,
  isSoftUser: boolean,
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>,
  setIsRealtimeActive: (active: boolean) => void
) {
  const softPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSoftInitializedRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);

  // Returns null on error so caller can distinguish from empty success
  const fetchSoftNotifications = useCallback(
    async (uid: string): Promise<SoftNotification[] | null> => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

      try {
        const params = new URLSearchParams({ limit: '50' });
        const response = await fetch(`/api/soft/notifications?${params.toString()}`, {
          headers: { 'x-user-id': uid },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.success && Array.isArray(data.notifications)) {
          return data.notifications as SoftNotification[];
        }
        return [];
      } catch (error) {
        const isNetworkError = error instanceof TypeError && /failed to fetch/i.test(error.message);
        if (!isNetworkError) {
          logger.error('Error fetching soft notifications', 'useSoftNotifications', error);
        }
        return null;
      }
    },
    []
  );

  useEffect(() => {
    if (!isClient || !userId || !isSoftUser) {
      if (softPollingRef.current) {
        clearTimeout(softPollingRef.current);
        softPollingRef.current = null;
      }
      return;
    }

    const schedulePoll = () => {
      const interval = Math.min(
        NOTIFICATION_POLL_INTERVAL * Math.pow(2, consecutiveFailuresRef.current),
        MAX_POLL_INTERVAL
      );
      softPollingRef.current = setTimeout(poll, interval);
    };

    const poll = async () => {
      debugLog('Polling...', { userId });

      const softNotifications = await fetchSoftNotifications(userId);

      if (softNotifications === null) {
        consecutiveFailuresRef.current = Math.min(consecutiveFailuresRef.current + 1, 5);
        schedulePoll();
        return;
      }

      // Success — reset backoff
      consecutiveFailuresRef.current = 0;

      if (softNotifications.length > 0) {
        debugLog('Found:', softNotifications.length);

        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newNotifications = softNotifications
            .filter((n) => !existingIds.has(n.id))
            .map((n) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              timestamp: new Date(n.createdAt),
              read: n.read,
              source: 'soft' as const,
              data: {
                ...n.data,
                sourceUserId: n.sourceUserId,
                sourceUsername: n.sourceUsername,
              },
            }));

          // Update read status of existing notifications from server
          const updated = prev.map((existing) => {
            const serverVersion = softNotifications.find((n) => n.id === existing.id);
            if (serverVersion && serverVersion.read !== existing.read) {
              return { ...existing, read: serverVersion.read };
            }
            return existing;
          });

          if (newNotifications.length === 0) return updated;
          return [...newNotifications, ...updated].slice(0, 100);
        });
      }

      schedulePoll();
    };

    if (!hasSoftInitializedRef.current) {
      hasSoftInitializedRef.current = true;
      poll();
    } else {
      schedulePoll();
    }
    setIsRealtimeActive(true);

    return () => {
      if (softPollingRef.current) {
        clearTimeout(softPollingRef.current);
        softPollingRef.current = null;
      }
    };
  }, [isClient, userId, isSoftUser, fetchSoftNotifications, setNotifications, setIsRealtimeActive]);
}
