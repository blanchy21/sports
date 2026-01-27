'use client';

import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Wifi, WifiOff, Bell } from 'lucide-react';

export const RealtimeStatus: React.FC = () => {
  const { isRealtimeActive, unreadCount } = useNotifications();

  return (
    <div className="flex items-center space-x-2 text-sm">
      {isRealtimeActive ? (
        <div className="flex items-center space-x-1 text-accent">
          <Wifi className="h-4 w-4" />
          <span>Live</span>
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent"></div>
        </div>
      ) : (
        <div className="flex items-center space-x-1 text-muted-foreground">
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
        </div>
      )}

      {unreadCount > 0 && (
        <div className="flex items-center space-x-1 text-accent">
          <Bell className="h-4 w-4" />
          <span>{unreadCount}</span>
        </div>
      )}
    </div>
  );
};
