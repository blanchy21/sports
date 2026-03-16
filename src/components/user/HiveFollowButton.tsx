'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/core/Button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBroadcast } from '@/hooks/useBroadcast';
import { followUser, unfollowUser } from '@/lib/hive-workerbee/social';
import { logger } from '@/lib/logger';
import { toast } from '@/components/core/Toast';

interface HiveFollowButtonProps {
  targetUsername: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const HiveFollowButton: React.FC<HiveFollowButtonProps> = ({
  targetUsername,
  size = 'default',
  className,
}) => {
  const { user, isAuthenticated, authType } = useAuth();
  const { broadcast } = useBroadcast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const currentUsername = user?.username;

  // Check follow status on mount
  useEffect(() => {
    if (!currentUsername || !targetUsername || currentUsername === targetUsername) {
      setIsChecking(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(
          `/api/hive/follows?follower=${encodeURIComponent(currentUsername)}&targets=${encodeURIComponent(targetUsername)}`
        );
        if (res.ok) {
          const data = await res.json();
          setIsFollowing(data.followStatus?.[targetUsername] ?? false);
        }
      } catch {
        // Use default false
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [currentUsername, targetUsername]);

  const handleToggle = useCallback(async () => {
    if (!currentUsername || !targetUsername || isLoading) return;

    setIsLoading(true);
    try {
      const fn = isFollowing ? unfollowUser : followUser;
      const result = await fn(targetUsername, currentUsername, broadcast);

      if (result.success) {
        setIsFollowing(!isFollowing);
        toast.success(
          isFollowing ? `Unfollowed @${targetUsername}` : `Following @${targetUsername}`
        );
      } else {
        toast.error(result.error || 'Failed to update follow status');
      }
    } catch (error) {
      logger.error('Follow toggle error', 'HiveFollowButton', error);
      toast.error('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  }, [currentUsername, targetUsername, isFollowing, isLoading, broadcast]);

  // Don't render for own profile, unauthenticated, or non-hive users
  if (
    !isAuthenticated ||
    authType !== 'hive' ||
    !currentUsername ||
    currentUsername === targetUsername
  ) {
    return null;
  }

  const isDisabled = isLoading || isChecking;

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size={size}
      onClick={handleToggle}
      disabled={isDisabled}
      className={cn(
        'transition-all',
        isFollowing && 'hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive',
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
    </Button>
  );
};
