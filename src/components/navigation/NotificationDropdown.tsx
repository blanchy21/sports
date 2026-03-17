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
        return <Zap className="h-3.5 w-3.5 text-primary" />;
      case 'comment':
        return <MessageSquare className="h-3.5 w-3.5 text-accent" />;
      case 'vote':
        return <ThumbsUp className="h-3.5 w-3.5 text-accent" />;
      case 'post':
        return <FileText className="h-3.5 w-3.5 text-purple-500" />;
      case 'mention':
        return <AtSign className="h-3.5 w-3.5 text-accent" />;
      // Soft notification types
      case 'like':
        return <Heart className="h-3.5 w-3.5 text-destructive" />;
      case 'reply':
        return <MessageSquare className="h-3.5 w-3.5 text-info" />;
      case 'follow':
        return <UserPlus className="h-3.5 w-3.5 text-success" />;
      case 'tip':
        return <Coins className="h-3.5 w-3.5 text-warning" />;
      case 'system':
        return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-muted-foreground" />;
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
        return 'bg-destructive/10 border-destructive/30';
      case 'reply':
        return 'bg-info/10 border-info/30';
      case 'follow':
        return 'bg-success/10 border-success/30';
      case 'tip':
        return 'bg-warning/10 border-warning/30';
      case 'system':
        return 'bg-sb-turf border-sb-border';
      default:
        return 'bg-sb-turf border-sb-border';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full z-50 mt-2 max-h-[520px] w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-sb-border bg-sb-stadium shadow-lg"
      data-testid="notification-dropdown"
    >
      {/* Header */}
      <div className="border-b border-sb-border bg-sb-turf/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-sb-text-primary">Notifications</h3>
            {isRealtimeActive && (
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" title="Live" />
            )}
          </div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className={`h-7 px-2 text-xs ${showFilters || !allFiltersEnabled ? 'text-accent' : 'text-muted-foreground'} hover:text-sb-text-primary`}
            >
              <SlidersHorizontal className="mr-1 h-3 w-3" />
              Filter
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-sb-text-primary"
              >
                <Check className="mr-1 h-3 w-3" />
                Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      {showFilters && (
        <div className="flex flex-wrap gap-1 border-b border-sb-border bg-sb-turf/30 px-3 py-1.5">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => toggleFilter(cat.key)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                filters[cat.key]
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-sb-turf text-muted-foreground hover:bg-sb-turf/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-[420px] overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="mx-auto mb-1 h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs">
              {notifications.length > 0
                ? 'No notifications match your filters'
                : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-sb-border/30">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`cursor-pointer px-3 py-2 transition-colors hover:bg-sb-turf/50 ${
                  !notification.read ? 'bg-accent/5' : ''
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
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 shrink-0 rounded-full p-1 ${getNotificationColor(notification.type)}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13px] font-medium text-sb-text-primary">
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground/60">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })
                          .replace('about ', '')
                          .replace(' minutes', 'm')
                          .replace(' minute', 'm')
                          .replace(' hours', 'h')
                          .replace(' hour', 'h')
                          .replace(' days', 'd')
                          .replace(' day', 'd')
                          .replace(' ago', '')}
                      </span>
                    </div>

                    <p className="truncate text-xs text-muted-foreground">{notification.message}</p>
                  </div>

                  {!notification.read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-sb-border bg-sb-turf/50 px-3 py-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
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
