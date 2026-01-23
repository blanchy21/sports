"use client";

import React, { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Trash2, MessageSquare, ThumbsUp, FileText, AtSign, Zap } from "lucide-react";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function getNotificationUrl(notification: Notification): string | null {
  const data = notification.data;
  if (!data) return null;

  switch (notification.type) {
    case 'vote':
    case 'post':
      if (data.author && data.permlink) {
        return `/post/${data.author}/${data.permlink}`;
      }
      break;
    case 'comment':
    case 'short_reply':
    case 'mention':
      if (data.parentAuthor && data.parentPermlink) {
        return `/post/${data.parentAuthor}/${data.parentPermlink}`;
      }
      break;
  }

  return null;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef
}) => {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isRealtimeActive
  } = useNotifications();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'short_reply':
        return <Zap className="h-4 w-4 text-primary" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-accent" />;
      case 'vote':
        return <ThumbsUp className="h-4 w-4 text-accent" />;
      case 'post':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'mention':
        return <AtSign className="h-4 w-4 text-accent" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'short_reply':
        return 'bg-primary/10 border-primary/20';
      case 'comment':
        return 'bg-accent/10 border-accent/20';
      case 'vote':
        return 'bg-accent/10 border-accent/20';
      case 'post':
        return 'bg-purple-50 border-purple-200';
      case 'mention':
        return 'bg-accent/10 border-accent/20';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden"
      data-testid="notification-dropdown"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {isRealtimeActive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                <span className="text-xs text-accent">Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="text-xs text-gray-600 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
            {!isRealtimeActive && (
              <p className="text-xs text-gray-400 mt-1">
                Real-time monitoring is inactive
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-accent/10' : ''
                }`}
                onClick={() => {
                  markAsRead(notification.id);
                  const url = getNotificationUrl(notification);
                  if (url) {
                    onClose();
                    router.push(url);
                  }
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-accent rounded-full"></div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    
                    {notification.data && (
                      <div className="mt-2 flex items-center space-x-2">
                        {notification.data.author && (
                          <Badge variant="outline" className="text-xs">
                            @{notification.data.author}
                          </Badge>
                        )}
                        {notification.data.weight && (
                          <Badge variant="outline" className="text-xs">
                            {notification.data.weight}% vote
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
            <span>{unreadCount} unread</span>
          </div>
        </div>
      )}
    </div>
  );
};
