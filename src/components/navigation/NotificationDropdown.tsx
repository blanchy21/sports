'use client';

import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  Trash2,
  MessageSquare,
  ThumbsUp,
  FileText,
  AtSign,
  Zap,
  Heart,
  UserPlus,
  Info,
  Coins,
  SlidersHorizontal,
} from 'lucide-react';
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  useNotificationFilter,
  FILTER_CATEGORIES,
} from '@/contexts/notifications/useNotificationFilter';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/core/Button';
import { Badge } from '@/components/core/Badge';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function getNotificationUrl(notification: Notification): string | null {
  const data = notification.data;
  if (!data) return null;

  // Handle soft notification types
  if (notification.source === 'soft') {
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'reply':
        // Navigate to the post
        if (data.postPermlink) {
          // Soft posts use a different URL structure
          return `/post/soft/${data.postId || data.postPermlink}`;
        }
        break;
      case 'follow':
        // Navigate to the follower's profile
        if (data.sourceUsername) {
          return `/user/${data.sourceUsername}`;
        }
        break;
      case 'mention':
        if (data.postPermlink) {
          return `/post/soft/${data.postId || data.postPermlink}`;
        }
        break;
    }
    return null;
  }

  // Handle tip notifications — navigate to the sportsbite
  if (notification.type === 'tip') {
    if (data.author && data.permlink) {
      return `/@${data.author}/${data.permlink}`;
    }
    return null;
  }

  // Handle Hive notification types
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
  triggerRef,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isRealtimeActive,
  } = useNotifications();
  const { filters, toggleFilter, isVisible } = useNotificationFilter(user?.username);
  const [showFilters, setShowFilters] = React.useState(false);

  const filteredNotifications = React.useMemo(
    () => notifications.filter((n) => isVisible(n.type)),
    [notifications, isVisible]
  );
  const filteredUnreadCount = React.useMemo(
    () => filteredNotifications.filter((n) => !n.read).length,
    [filteredNotifications]
  );
  const allFiltersEnabled = Object.values(filters).every(Boolean);

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
      // Soft notification types
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'reply':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'tip':
        return <Coins className="h-4 w-4 text-amber-500" />;
      case 'system':
        return <Info className="h-4 w-4 text-gray-500" />;
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
        return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800';
      case 'mention':
        return 'bg-accent/10 border-accent/20';
      // Soft notification types
      case 'like':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'reply':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'follow':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'tip':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
      case 'system':
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full z-50 mt-2 max-h-96 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
      data-testid="notification-dropdown"
    >
      {/* Header */}
      <div className="border-b border-border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {isRealtimeActive && (
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-accent"></div>
                <span className="text-xs text-accent">Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className={`text-xs ${showFilters || !allFiltersEnabled ? 'text-accent' : 'text-muted-foreground'} hover:text-foreground`}
            >
              <SlidersHorizontal className="mr-1 h-3 w-3" />
              Filter
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="text-xs text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5 border-b border-border bg-muted/30 px-4 py-2.5">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => toggleFilter(cat.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                filters[cat.key]
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm">
              {notifications.length > 0
                ? 'No notifications match your filters'
                : 'No notifications yet'}
            </p>
            {notifications.length === 0 && !isRealtimeActive && (
              <p className="mt-1 text-xs text-muted-foreground/70">
                Real-time monitoring is inactive
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`cursor-pointer p-4 transition-colors hover:bg-muted/50 ${
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
                  <div className={`rounded-full p-2 ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-foreground">{notification.title}</h4>
                      {!notification.read && <div className="h-2 w-2 rounded-full bg-accent"></div>}
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>

                    {notification.data && (
                      <div className="mt-2 flex items-center space-x-2">
                        {/* Hive notification badges */}
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
                        {/* Soft notification badges */}
                        {notification.data.sourceUsername && !notification.data.author && (
                          <Badge variant="outline" className="text-xs">
                            @{notification.data.sourceUsername}
                          </Badge>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-muted-foreground/70">
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
        <div className="border-t border-border bg-muted/50 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filteredNotifications.length}
              {!allFiltersEnabled && ` of ${notifications.length}`} notification
              {filteredNotifications.length !== 1 ? 's' : ''}
            </span>
            <span>{filteredUnreadCount} unread</span>
          </div>
        </div>
      )}
    </div>
  );
};
