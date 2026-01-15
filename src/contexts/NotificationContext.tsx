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
  type: 'comment' | 'vote' | 'post' | 'mention';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: {
    author?: string;
    permlink?: string;
    parentAuthor?: string;
    parentPermlink?: string;
    weight?: number;
    voter?: string;
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
  const { user, isClient } = useAuth();

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

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
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

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

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

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (username: string, since?: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      notificationDebugLog('Skipping notifications fetch: offline');
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
        notificationDebugLog('Notification fetch failed (network).', error);
      } else {
        console.error('Error fetching notifications:', error);
      }
      return [];
    }
  }, []);

  // Initialize polling when user is logged in
  useEffect(() => {
    if (!isClient || !user?.username) {
      setIsRealtimeActive(false);
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
      notificationDebugLog('Polling for notifications...', { username, since: lastCheckRef.current });

      const newNotifications = await fetchNotifications(username, lastCheckRef.current || undefined);

      if (newNotifications.length > 0) {
        notificationDebugLog('Found new notifications:', newNotifications.length);

        // Add new notifications (avoiding duplicates)
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const uniqueNew = newNotifications
            .filter(n => !existingIds.has(n.id))
            .map(n => ({
              ...n,
              type: n.type as 'comment' | 'vote' | 'post' | 'mention',
              timestamp: new Date(n.timestamp),
              read: false,
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

    // Initial poll
    poll();
    setIsRealtimeActive(true);

    // Set up interval
    pollingRef.current = setInterval(poll, NOTIFICATION_POLL_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isClient, user?.username, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isRealtimeActive,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
