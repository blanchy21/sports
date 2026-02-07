import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from '@/lib/logger';
import type { Notification } from './types';

const NOTIFICATION_STORAGE_PREFIX = 'sportsblock-notifications';

function getStorageKey(username?: string | null): string {
  if (username && username.trim()) {
    return `${NOTIFICATION_STORAGE_PREFIX}:${username.toLowerCase()}`;
  }
  return `${NOTIFICATION_STORAGE_PREFIX}:guest`;
}

export function useNotificationStorage(username: string | null | undefined, isClient: boolean) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const storageKey = useMemo(() => getStorageKey(username), [username]);

  // Load from localStorage
  useEffect(() => {
    if (!isClient) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Array<
          Omit<Notification, 'timestamp'> & { timestamp: string }
        >;
        setNotifications(parsed.map((n) => ({ ...n, timestamp: new Date(n.timestamp) })));
      } else {
        setNotifications([]);
      }
    } catch (error) {
      logger.error('Error loading notifications', 'useNotificationStorage', error);
      setNotifications([]);
    }
  }, [isClient, storageKey]);

  // Debounced save to localStorage
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isClient) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(notifications));
      } catch (error) {
        logger.error('Error saving notifications', 'useNotificationStorage', error);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notifications, isClient, storageKey]);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotification, ...prev].slice(0, 100));
    },
    []
  );

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (isClient) {
      localStorage.removeItem(storageKey);
    }
  }, [isClient, storageKey]);

  return { notifications, setNotifications, addNotification, clearNotifications };
}
