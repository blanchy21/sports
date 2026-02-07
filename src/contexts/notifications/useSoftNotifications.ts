import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { Notification } from './types';

const NOTIFICATION_POLL_INTERVAL = 30000;

const notificationsDebugEnabled =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_DEBUG === 'true' || process.env.NODE_ENV === 'development';

const debugLog = (...args: unknown[]) => {
  if (notificationsDebugEnabled) console.debug('[SoftNotifications]', ...args);
};

export function useSoftNotifications(
  userId: string | null | undefined,
  isClient: boolean,
  isSoftUser: boolean,
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>,
  setIsRealtimeActive: (active: boolean) => void
) {
  const softPollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasSoftInitializedRef = useRef(false);

  const fetchSoftNotifications = useCallback(async (uid: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];

    try {
      const params = new URLSearchParams({ limit: '50' });
      const response = await fetch(`/api/soft/notifications?${params.toString()}`, {
        headers: { 'x-user-id': uid },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success && Array.isArray(data.notifications)) {
        return data.notifications as Array<{
          id: string;
          type: 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'system';
          title: string;
          message: string;
          read: boolean;
          createdAt: string;
          sourceUserId?: string;
          sourceUsername?: string;
          data?: Record<string, unknown>;
        }>;
      }
      return [];
    } catch (error) {
      const isNetworkError = error instanceof TypeError && /failed to fetch/i.test(error.message);
      if (!isNetworkError) {
        logger.error('Error fetching soft notifications', 'useSoftNotifications', error);
      }
      return [];
    }
  }, []);

  useEffect(() => {
    if (!isClient || !userId || !isSoftUser) {
      if (softPollingRef.current) {
        clearInterval(softPollingRef.current);
        softPollingRef.current = null;
      }
      return;
    }

    const poll = async () => {
      debugLog('Polling...', { userId });

      const softNotifications = await fetchSoftNotifications(userId);
      if (softNotifications.length > 0) {
        debugLog('Found:', softNotifications.length);

        setNotifications(
          softNotifications.map((n) => ({
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
          }))
        );
      }
    };

    if (!hasSoftInitializedRef.current) {
      hasSoftInitializedRef.current = true;
      poll();
    }
    setIsRealtimeActive(true);

    if (!softPollingRef.current) {
      softPollingRef.current = setInterval(poll, NOTIFICATION_POLL_INTERVAL);
    }

    return () => {
      if (softPollingRef.current) {
        clearInterval(softPollingRef.current);
        softPollingRef.current = null;
      }
    };
  }, [isClient, userId, isSoftUser, fetchSoftNotifications, setNotifications, setIsRealtimeActive]);
}
