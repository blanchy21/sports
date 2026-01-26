"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./AuthContext";

const NOTIFICATION_STORAGE_PREFIX = 'sportsblock-notifications';
const NOTIFICATION_POLL_INTERVAL = 30000; // 30 seconds
const NOTIFICATION_LAST_CHECK_KEY = 'sportsblock-notifications-last-check';

const notificationsDebugEnabled =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_DEBUG === 'true' || process.env.NODE_ENV === 'development';

const notificationDebugLog = (...args: unknown[]) => {
  if (!notificationsDebugEnabled) {
    return;
  }
  console.debug('[NotificationContext]', ...args);
};

const getStorageKey = (username?: string | null) => {
  if (username && username.trim()) {
    return `${NOTIFICATION_STORAGE_PREFIX}:${username.toLowerCase()}`;
  }
  return `${NOTIFICATION_STORAGE_PREFIX}:guest`;
};

export interface Notification {
  id: string;
  type: 'comment' | 'vote' | 'post' | 'mention' | 'short_reply' | 'like' | 'reply' | 'follow' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  source?: 'hive' | 'soft'; // Track notification source for proper handling
  data?: {
    author?: string;
    permlink?: string;
    parentAuthor?: string;
    parentPermlink?: string;
    weight?: number;
    voter?: string;
    isShort?: boolean;
    // Soft notification data
    postId?: string;
    postPermlink?: string;
    commentId?: string;
    parentCommentId?: string;
    targetType?: string;
    targetId?: string;
    sourceUserId?: string;
    sourceUsername?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  isRealtimeActive: boolean;
  isSoftUser: boolean; // Indicates if notifications are from soft system
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const { user, isClient, authType } = useAuth();
  const isSoftUser = authType === 'soft';

  const storageKey = useMemo(() => getStorageKey(user?.username), [user?.username]);

  // Load notifications from localStorage when client/user ready
  useEffect(() => {
    if (!isClient) return;

    try {
      const savedNotifications = localStorage.getItem(storageKey);
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications) as Array<Omit<Notification, 'timestamp'> & { timestamp: string }>;
        const notificationsWithDates = parsed.map((n) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        setNotifications(notificationsWithDates);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  }, [isClient, storageKey]);

  // Save notifications to localStorage with debouncing to prevent excessive writes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isClient) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce localStorage writes by 500ms
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(notifications));
      } catch (error) {
        console.error('Error saving notifications:', error);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notifications, isClient, storageKey]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 100)); // Keep last 100 notifications
  }, []);

  // Mark soft notifications as read on server (defined before markAsRead/markAllAsRead which use it)
  const markSoftNotificationsAsRead = useCallback(async (userId: string, notificationIds?: string[], markAll?: boolean) => {
    try {
      const response = await fetch('/api/soft/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(
          markAll ? { markAllRead: true } : { notificationIds }
        ),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      // Sync with server for soft notifications
      if (notification?.source === 'soft' && user?.id) {
        markSoftNotificationsAsRead(user.id, [id]);
      }
      return prev.map(n =>
        n.id === id
          ? { ...n, read: true }
          : n
      );
    });
  }, [user?.id, markSoftNotificationsAsRead]);

  const markAllAsRead = useCallback(() => {
    // Sync with server for soft users
    if (isSoftUser && user?.id) {
      markSoftNotificationsAsRead(user.id, undefined, true);
    }
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, [isSoftUser, user?.id, markSoftNotificationsAsRead]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (isClient) {
      localStorage.removeItem(storageKey);
    }
  }, [isClient, storageKey]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Track polling state
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  // Fetch Hive notifications from API
  const fetchHiveNotifications = useCallback(async (username: string, since?: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      notificationDebugLog('Skipping Hive notifications fetch: offline');
      return [];
    }

    try {
      const params = new URLSearchParams({ username, limit: '50' });
      if (since) {
        params.set('since', since);
      }

      const response = await fetch(`/api/hive/notifications?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

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
      if (isNetworkError) {
        notificationDebugLog('Hive notification fetch failed (network).', error);
      } else {
        console.error('Error fetching Hive notifications:', error);
      }
      return [];
    }
  }, []);

  // Fetch soft notifications from API
  const fetchSoftNotifications = useCallback(async (userId: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      notificationDebugLog('Skipping soft notifications fetch: offline');
      return [];
    }

    try {
      const params = new URLSearchParams({ limit: '50' });
      const response = await fetch(`/api/soft/notifications?${params.toString()}`, {
        headers: {
          'x-user-id': userId,
        },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

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
      if (isNetworkError) {
        notificationDebugLog('Soft notification fetch failed (network).', error);
      } else {
        console.error('Error fetching soft notifications:', error);
      }
      return [];
    }
  }, []);

  // Initialize polling when user is logged in (Hive users)
  useEffect(() => {
    // Skip for soft users - they use a different polling mechanism
    if (!isClient || !user?.username || isSoftUser) {
      if (!isSoftUser) {
        setIsRealtimeActive(false);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const username = user.username;

    // Get last check timestamp from localStorage
    const lastCheckKey = `${NOTIFICATION_LAST_CHECK_KEY}:${username}`;
    lastCheckRef.current = localStorage.getItem(lastCheckKey);

    const poll = async () => {
      notificationDebugLog('Polling for Hive notifications...', { username, since: lastCheckRef.current });

      const newNotifications = await fetchHiveNotifications(username, lastCheckRef.current || undefined);

      if (newNotifications.length > 0) {
        notificationDebugLog('Found new Hive notifications:', newNotifications.length);

        // Add new notifications (avoiding duplicates)
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNew = newNotifications
            .filter(n => !existingIds.has(n.id))
            .map(n => ({
              ...n,
              type: n.type as 'comment' | 'vote' | 'post' | 'mention' | 'short_reply',
              timestamp: new Date(n.timestamp),
              read: false,
              source: 'hive' as const,
            }));

          if (uniqueNew.length === 0) return prev;

          return [...uniqueNew, ...prev].slice(0, 100);
        });
      }

      // Update last check timestamp
      const now = new Date().toISOString();
      lastCheckRef.current = now;
      localStorage.setItem(lastCheckKey, now);
    };

    // Only do initial poll once per session (not on every navigation)
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      poll();
    }
    setIsRealtimeActive(true);

    // Set up interval (only if not already running)
    if (!pollingRef.current) {
      pollingRef.current = setInterval(poll, NOTIFICATION_POLL_INTERVAL);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isClient, user?.username, isSoftUser, fetchHiveNotifications]);

  // Initialize polling when soft user is logged in
  const softPollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasSoftInitializedRef = useRef(false);

  useEffect(() => {
    if (!isClient || !user?.id || !isSoftUser) {
      if (softPollingRef.current) {
        clearInterval(softPollingRef.current);
        softPollingRef.current = null;
      }
      return;
    }

    const userId = user.id;

    const pollSoft = async () => {
      notificationDebugLog('Polling for soft notifications...', { userId });

      const softNotifications = await fetchSoftNotifications(userId);

      if (softNotifications.length > 0) {
        notificationDebugLog('Found soft notifications:', softNotifications.length);

        // Replace all notifications with server state (soft notifications are server-managed)
        setNotifications(
          softNotifications.map(n => ({
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

    // Do initial fetch
    if (!hasSoftInitializedRef.current) {
      hasSoftInitializedRef.current = true;
      pollSoft();
    }
    setIsRealtimeActive(true);

    // Set up interval
    if (!softPollingRef.current) {
      softPollingRef.current = setInterval(pollSoft, NOTIFICATION_POLL_INTERVAL);
    }

    return () => {
      if (softPollingRef.current) {
        clearInterval(softPollingRef.current);
        softPollingRef.current = null;
      }
    };
  }, [isClient, user?.id, isSoftUser, fetchSoftNotifications]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isRealtimeActive,
    isSoftUser,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
