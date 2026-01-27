'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowers } from '@/lib/react-query/queries/useFollowers';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { Users, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FollowersPage() {
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

  if (!user) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h2 className="mb-2 text-xl font-semibold">Please sign in to view your followers</h2>
          <Button onClick={() => router.push('/auth')}>Sign In</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={false}>
      <div className="mx-auto max-w-4xl py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-muted"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Followers</h1>
                <p className="text-muted-foreground">People who follow @{user.username}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {followersData?.total ?? followersData?.relationships?.length ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Total followers</div>
          </div>
        </div>

        {/* Content */}
        <Card className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gray-300"></div>
                  <div className="flex-1">
                    <div className="mb-2 h-4 w-1/3 rounded bg-gray-300"></div>
                    <div className="h-3 w-1/2 rounded bg-gray-300"></div>
                  </div>
                  <div className="h-8 w-20 rounded bg-gray-300"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl">😞</div>
              <h3 className="mb-2 text-xl font-semibold">Error Loading Followers</h3>
              <p className="mb-4 text-muted-foreground">
                There was an error loading your followers. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : followersData?.relationships.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl">👥</div>
              <h3 className="mb-2 text-xl font-semibold">No Followers Yet</h3>
              <p className="mb-4 text-muted-foreground">
                You haven&apos;t gained any followers yet. Start posting great content to attract
                followers!
              </p>
              <Button onClick={() => router.push('/publish')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Your First Post
              </Button>
            </div>
          ) : (
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
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUserClick(rel.follower)}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
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
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
