'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils/client';

interface LastSeenIndicatorProps {
  lastActiveAt?: string | Date;
  className?: string;
  showIcon?: boolean;
}

/**
 * Format a date as relative time (e.g., "5 minutes ago", "2 days ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  } else {
    return 'over a year ago';
  }
}

/**
 * Determine the activity status color based on time since last active
 */
function getActivityStatus(date: Date): { color: string; status: string } {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 5) {
    return { color: 'text-success', status: 'online' };
  } else if (diffMinutes < 60) {
    return { color: 'text-success', status: 'recently active' };
  } else if (diffHours < 24) {
    return { color: 'text-warning', status: 'active today' };
  } else if (diffDays < 7) {
    return { color: 'text-orange-400', status: 'active this week' };
  } else if (diffDays < 30) {
    return { color: 'text-muted-foreground', status: 'active this month' };
  } else {
    return { color: 'text-muted-foreground/60', status: 'inactive' };
  }
}

export const LastSeenIndicator: React.FC<LastSeenIndicatorProps> = ({
  lastActiveAt,
  className,
  showIcon = true,
}) => {
  if (!lastActiveAt) {
    return null;
  }

  const date = typeof lastActiveAt === 'string' ? new Date(lastActiveAt) : lastActiveAt;
  const relativeTime = formatRelativeTime(date);
  const { color } = getActivityStatus(date);

  return (
    <div
      className={cn('flex items-center space-x-1.5 text-sm', color, className)}
      title={`Last seen: ${date.toLocaleString()}`}
    >
      {showIcon && <Clock className="h-3.5 w-3.5" />}
      <span>Last seen {relativeTime}</span>
    </div>
  );
};

/**
 * Compact version showing just a dot indicator
 */
export const LastSeenDot: React.FC<{
  lastActiveAt?: string | Date;
  className?: string;
}> = ({ lastActiveAt, className }) => {
  if (!lastActiveAt) {
    return null;
  }

  const date = typeof lastActiveAt === 'string' ? new Date(lastActiveAt) : lastActiveAt;
  const { color, status } = getActivityStatus(date);

  // Extract the actual color class (e.g., "green" from "text-green-500")
  const dotColor = color.replace('text-', 'bg-');

  return (
    <div
      className={cn('flex items-center', className)}
      title={`${status} - Last seen: ${date.toLocaleString()}`}
    >
      <div className={cn('h-2 w-2 rounded-full', dotColor)} />
    </div>
  );
};
