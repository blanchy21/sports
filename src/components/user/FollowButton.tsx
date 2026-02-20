'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/core/Button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
  showCount?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onFollowChange?: (isFollowing: boolean, followerCount: number) => void;
  onRequireAuth?: () => void;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  targetUsername,
  initialIsFollowing = false,
  initialFollowerCount = 0,
  showCount = false,
  size = 'default',
  className,
  onFollowChange,
  onRequireAuth,
}) => {
  const { user, isAuthenticated, authType } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!targetUserId) {
        setIsChecking(false);
        return;
      }

      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (isAuthenticated && authType === 'soft' && user?.id) {
          headers['x-user-id'] = user.id;
        }

        const response = await fetch('/api/soft/follows', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ targetUserId }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing);
          setFollowerCount(data.stats.followerCount);
        }
      } catch {
        // Silently fail - use initial values
      } finally {
        setIsChecking(false);
      }
    };

    checkFollowStatus();
  }, [targetUserId, isAuthenticated, authType, user?.id]);

  const handleFollow = useCallback(async () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user?.id) {
      onRequireAuth?.();
      return;
    }

    // Only soft users can follow other users in the soft system
    if (authType !== 'soft') {
      return;
    }

    // Can't follow yourself
    if (user.id === targetUserId) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/soft/follows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          targetUserId,
          targetUsername,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle follow');
      }

      setIsFollowing(data.isFollowing);
      setFollowerCount(data.followerCount);
      onFollowChange?.(data.isFollowing, data.followerCount);
    } catch (error) {
      logger.error('Follow error', 'FollowButton', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    authType,
    user?.id,
    targetUserId,
    targetUsername,
    onFollowChange,
    onRequireAuth,
  ]);

  // Don't show button for own profile or non-soft users
  if (user?.id === targetUserId) {
    return null;
  }

  // Only soft users can follow
  if (isAuthenticated && authType !== 'soft') {
    return null;
  }

  const isDisabled = isLoading || isChecking;

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size={size}
      onClick={handleFollow}
      disabled={isDisabled}
      className={cn(
        'transition-all',
        isFollowing && 'hover:border-red-200 hover:bg-red-50 hover:text-red-600',
        className
      )}
    >
      {isLoading || isChecking ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="mr-1 h-4 w-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="mr-1 h-4 w-4" />
          <span>Follow</span>
        </>
      )}
      {showCount && !isChecking && (
        <span className="ml-1 text-xs opacity-70">({followerCount})</span>
      )}
    </Button>
  );
};

// Compact version for lists
export const FollowButtonCompact: React.FC<FollowButtonProps> = (props) => {
  return <FollowButton {...props} size="sm" showCount={false} />;
};
