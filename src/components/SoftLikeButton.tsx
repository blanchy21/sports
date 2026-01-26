"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// Popular post threshold for upgrade prompts
const POPULAR_POST_THRESHOLD = 10;

interface SoftLikeButtonProps {
  targetType: 'post' | 'comment';
  targetId: string;
  initialLikeCount?: number;
  initialHasLiked?: boolean;
  className?: string;
  // The author's user ID - used to determine if we should show upgrade prompt
  authorId?: string;
  onLikeSuccess?: (liked: boolean, likeCount: number) => void;
  onLikeError?: (error: string) => void;
  onRequireAuth?: () => void;
  // Called when current user's post reaches the popularity threshold
  onPopularPostThreshold?: (likeCount: number) => void;
}

export const SoftLikeButton: React.FC<SoftLikeButtonProps> = ({
  targetType,
  targetId,
  initialLikeCount = 0,
  initialHasLiked = false,
  className,
  authorId,
  onLikeSuccess,
  onLikeError,
  onRequireAuth,
  onPopularPostThreshold,
}) => {
  const { user, isAuthenticated, authType } = useAuth();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check like status on mount
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!targetId) return;

      try {
        const params = new URLSearchParams({
          targetType,
          targetId,
        });

        const headers: HeadersInit = {};
        if (isAuthenticated && authType === 'soft' && user?.id) {
          headers['x-user-id'] = user.id;
        }

        const response = await fetch(`/api/soft/likes?${params}`, { headers });
        if (response.ok) {
          const data = await response.json();
          setLikeCount(data.likeCount);
          setHasLiked(data.hasLiked);
        }
      } catch {
        // Silently fail - use initial values
      }
    };

    checkLikeStatus();
  }, [targetId, targetType, isAuthenticated, authType, user?.id]);

  const handleLike = useCallback(async () => {
    // Check if user is authenticated
    if (!isAuthenticated || !user?.id) {
      onRequireAuth?.();
      return;
    }

    // Only soft users can like soft posts
    if (authType !== 'soft') {
      setError('Only email users can like posts. Hive users should use the star voting system.');
      onLikeError?.('Only email users can like posts');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/soft/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          targetType,
          targetId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle like');
      }

      const previousLikeCount = likeCount;
      setHasLiked(data.liked);
      setLikeCount(data.likeCount);
      onLikeSuccess?.(data.liked, data.likeCount);

      // Check if post just crossed the popularity threshold
      // Only notify if this is the user's own post and it just hit the threshold
      if (
        data.liked &&
        authorId === user.id &&
        previousLikeCount < POPULAR_POST_THRESHOLD &&
        data.likeCount >= POPULAR_POST_THRESHOLD &&
        onPopularPostThreshold
      ) {
        onPopularPostThreshold(data.likeCount);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle like';
      setError(errorMessage);
      onLikeError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authType, user?.id, targetType, targetId, likeCount, authorId, onLikeSuccess, onLikeError, onRequireAuth, onPopularPostThreshold]);

  const isDisabled = isLoading;

  return (
    <div className={cn("flex items-center", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        disabled={isDisabled}
        className={cn(
          "flex items-center space-x-1 text-muted-foreground hover:text-red-500 h-8 px-2",
          hasLiked && "text-red-500",
          isDisabled && "opacity-50 cursor-not-allowed"
        )}
        title={
          !isAuthenticated
            ? "Sign in to like this post"
            : hasLiked
            ? "Unlike"
            : "Like this post"
        }
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={cn("h-4 w-4", hasLiked && "fill-current")} />
        )}
        <span className="text-xs font-medium">{likeCount}</span>
      </Button>

      {/* Error Display */}
      {error && (
        <div className="ml-2 text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

// Compact version for comment sections
export const SoftLikeButtonCompact: React.FC<SoftLikeButtonProps> = (props) => {
  return (
    <SoftLikeButton
      {...props}
      className={cn("scale-90", props.className)}
    />
  );
};
