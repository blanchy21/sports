'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import type { Notification, NotificationContextType } from './notifications/types';
import { useNotificationStorage } from './notifications/useNotificationStorage';
import { useHiveNotifications } from './notifications/useHiveNotifications';
import { useSoftNotifications } from './notifications/useSoftNotifications';

// Re-export types so existing consumers don't break
export type { Notification } from './notifications/types';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isClient, authType } = useAuth();
  const isSoftUser = authType === 'soft';
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Storage: load/save/add/clear
  const { notifications, setNotifications, addNotification, clearNotifications } =
    useNotificationStorage(user?.username, isClient);

  // Hive polling (no-ops when isSoftUser or no user)
  useHiveNotifications(user?.username, isClient, isSoftUser, setNotifications, setIsRealtimeActive);

  // Soft polling (no-ops when !isSoftUser or no user)
  useSoftNotifications(user?.id, isClient, isSoftUser, setNotifications, setIsRealtimeActive);

  // Mark-as-read with optional server sync for soft notifications
  const markSoftNotificationsAsRead = useCallback(
    async (userId: string, notificationIds?: string[], markAll?: boolean) => {
      try {
        await fetch('/api/soft/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify(markAll ? { markAllRead: true } : { notificationIds }),
        });
      } catch (error) {
        // Best-effort server sync -- log non-network errors for diagnosability
        if (!(error instanceof TypeError && /failed to fetch/i.test((error as Error).message))) {
          console.warn('[NotificationContext] Failed to sync notification read status:', error);
        }
      }
    },
    []
  );

  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === id);
        if (notification?.source === 'soft' && user?.id) {
          markSoftNotificationsAsRead(user.id, [id]);
        }
        return prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      });
    },
    [user?.id, markSoftNotificationsAsRead, setNotifications]
  );

  const markAllAsRead = useCallback(() => {
    if (isSoftUser && user?.id) {
      markSoftNotificationsAsRead(user.id, undefined, true);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [isSoftUser, user?.id, markSoftNotificationsAsRead, setNotifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        isRealtimeActive,
        isSoftUser,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
