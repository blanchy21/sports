'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowing, useUnfollowUser } from '@/lib/react-query/queries/useFollowers';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function FollowingContent() {
  const { user } = useAuth();
  const router = useRouter();

  const {
    data: followingData,
    isLoading,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useFollowing(user?.username || '', { enabled: !!user?.username });

  const unfollowMutation = useUnfollowUser();

  const handleUserClick = (username: string) => {
    router.push(`/user/${username}`);
  };

  const handleUnfollow = async (username: string) => {
    if (!user?.username) return;
    try {
      await unfollowMutation.mutateAsync({
        username,
        follower: user.username,
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-muted"></div>
            <div className="flex-1">
              <div className="mb-2 h-4 w-1/3 rounded bg-muted"></div>
              <div className="h-3 w-1/2 rounded bg-muted"></div>
            </div>
            <div className="h-8 w-20 rounded bg-muted"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <h3 className="mb-2 text-xl font-semibold">Error Loading Following</h3>
        <p className="mb-4 text-muted-foreground">
          There was an error loading who you&apos;re following. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (followingData?.relationships.length === 0) {
    return (
      <div className="py-12 text-center">
        <h3 className="mb-2 text-xl font-semibold">Not Following Anyone</h3>
        <p className="mb-4 text-muted-foreground">
          You&apos;re not following anyone yet. Discover interesting users to follow!
        </p>
        <Button onClick={() => router.push('/discover')}>
          <UserPlus className="mr-2 h-4 w-4" />
          Discover Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {followingData?.relationships.map((rel) => (
        <div
          key={`${rel.follower}-${rel.following}`}
          className="flex items-center justify-between rounded-lg p-4 transition-colors hover:bg-muted/50"
        >
          <div
            className="flex flex-1 cursor-pointer items-center space-x-4"
            onClick={() => handleUserClick(rel.following)}
          >
            <Avatar fallback={rel.following} alt={rel.following} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">@{rel.following}</div>
              <div className="text-sm text-muted-foreground">You&apos;re following this user</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleUserClick(rel.following)}>
              View Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnfollow(rel.following)}
              disabled={unfollowMutation.isPending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive/80"
            >
              <UserMinus className="mr-1 h-4 w-4" />
              Unfollow
            </Button>
          </div>
        </div>
      ))}

      {hasNextPage && (
        <div className="pt-6 text-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Following'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
