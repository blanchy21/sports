"use client";

import React from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Wifi, WifiOff, Bell } from "lucide-react";

export const RealtimeStatus: React.FC = () => {
  const { isRealtimeActive, unreadCount } = useNotifications();

  return (
    <div className="flex items-center space-x-2 text-sm">
      {isRealtimeActive ? (
        <div className="flex items-center space-x-1 text-accent">
          <Wifi className="h-4 w-4" />
          <span>Live</span>
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
        </div>
      ) : (
        <div className="flex items-center space-x-1 text-gray-500">
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
        </div>
      )}
      
      {unreadCount > 0 && (
        <div className="flex items-center space-x-1 text-maximum-yellow">
          <Bell className="h-4 w-4" />
          <span>{unreadCount}</span>
        </div>
      )}
    </div>
  );
};
