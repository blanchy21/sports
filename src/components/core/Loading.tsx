'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/client';

interface LoadingProps {
  /**
   * Size of the loading indicator
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Text to display below the loading indicator
   */
  text?: string;

  /**
   * Whether to show a full-page loading overlay
   */
  fullPage?: boolean;

  /**
   * Whether to show a skeleton loader instead of spinner
   */
  skeleton?: boolean;

  /**
   * Number of skeleton lines to show (only used when skeleton=true)
   */
  skeletonLines?: number;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Inline loading (smaller, for buttons/inline use)
   */
  inline?: boolean;
}

/**
 * Consistent Loading Component
 *
 * Provides consistent loading states across the application
 */
export function Loading({
  size = 'md',
  text,
  fullPage = false,
  skeleton = false,
  skeletonLines = 3,
  className,
  inline = false,
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Skeleton loader
  if (skeleton) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: skeletonLines }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div
              className={cn('bg-muted h-4 rounded', i === skeletonLines - 1 ? 'w-3/4' : 'w-full')}
            />
          </div>
        ))}
      </div>
    );
  }

  // Inline loading (for buttons, etc.)
  if (inline) {
    return <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />;
  }

  // Full page loading
  if (fullPage) {
    return (
      <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xs">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className={cn('text-primary animate-spin', sizeClasses.lg)} />
          {text && <p className={cn('text-muted-foreground', textSizeClasses.md)}>{text}</p>}
        </div>
      </div>
    );
  }

  // Default loading (centered in container)
  return (
    <div className={cn('flex flex-col items-center justify-center space-y-4 py-8', className)}>
      <Loader2 className={cn('text-primary animate-spin', sizeClasses[size])} />
      {text && <p className={cn('text-muted-foreground', textSizeClasses[size])}>{text}</p>}
    </div>
  );
}

/**
 * Loading Skeleton for Posts
 */
export function PostLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-border bg-card animate-pulse space-y-4 rounded-lg border p-6"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-muted h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="bg-muted h-4 w-1/4 rounded" />
              <div className="bg-muted h-3 w-1/6 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="bg-muted h-6 w-3/4 rounded" />
            <div className="bg-muted h-4 w-full rounded" />
            <div className="bg-muted h-4 w-5/6 rounded" />
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-muted h-4 w-16 rounded" />
            <div className="bg-muted h-4 w-16 rounded" />
            <div className="bg-muted h-4 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading Skeleton for Cards
 */
export function CardLoadingSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-border bg-card animate-pulse rounded-lg border p-4">
          <div className="bg-muted mb-2 h-4 w-1/3 rounded" />
          <div className="bg-muted mb-1 h-3 w-full rounded" />
          <div className="bg-muted h-3 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}
