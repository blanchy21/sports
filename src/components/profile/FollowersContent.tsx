'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowers } from '@/lib/react-query/queries/useFollowers';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { UserPlus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function FollowersContent() {
  const { user } = useAuth();
  const router = useRouter();

  const {
    data: followersData,
    isLoading,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useFollowers(user?.username || '', { enabled: !!user?.username });

  const handleUserClick = (username: string) => {
    router.push(`/user/${username}`);
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
        <h3 className="mb-2 text-xl font-semibold">Error Loading Followers</h3>
        <p className="mb-4 text-muted-foreground">
          There was an error loading your followers. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (followersData?.relationships.length === 0) {
    return (
      <div className="py-12 text-center">
        <h3 className="mb-2 text-xl font-semibold">No Followers Yet</h3>
        <p className="mb-4 text-muted-foreground">
          Start posting great content to attract followers!
        </p>
        <Button onClick={() => router.push('/publish')}>
          <UserPlus className="mr-2 h-4 w-4" />
          Create Your First Post
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {followersData?.relationships.map((rel) => (
        <div
          key={`${rel.follower}-${rel.following}`}
          className="flex items-center justify-between rounded-lg p-4 transition-colors hover:bg-muted/50"
        >
          <div
            className="flex flex-1 cursor-pointer items-center space-x-4"
            onClick={() => handleUserClick(rel.follower)}
          >
            <Avatar fallback={rel.follower} alt={rel.follower} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">@{rel.follower}</div>
              <div className="text-sm text-muted-foreground">Started following you</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleUserClick(rel.follower)}>
            View Profile
          </Button>
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
              'Load More Followers'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
