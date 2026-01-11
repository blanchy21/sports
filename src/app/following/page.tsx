"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowing } from "@/lib/react-query/queries/useFollowers";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MainLayout } from "@/components/layout/MainLayout";
import { Users, UserPlus, ArrowLeft, UserMinus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUnfollowUser } from "@/lib/react-query/queries/useFollowers";

export default function FollowingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const {
    data: followingData,
    isLoading,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage
  } = useFollowing(
    user?.username || '',
    { enabled: !!user?.username }
  );

  const unfollowMutation = useUnfollowUser();

  const handleUserClick = (username: string) => {
    router.push(`/user/${username}`);
  };

  const handleUnfollow = async (username: string) => {
    if (!user?.username) return;

    try {
      await unfollowMutation.mutateAsync({
        username,
        follower: user.username
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

  if (!user) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Please sign in to view who you&apos;re following</h2>
          <Button onClick={() => router.push("/auth")}>
            Sign In
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showRightSidebar={false}>
      <div className="max-w-4xl mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
                <h1 className="text-3xl font-bold">Following</h1>
                <p className="text-muted-foreground">
                  People @{user.username} is following
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {followingData?.total ?? followingData?.relationships?.length ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Total following</div>
          </div>
        </div>

        {/* Content */}
        <Card className="p-6">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-8 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">😞</div>
              <h3 className="text-xl font-semibold mb-2">Error Loading Following</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading who you&apos;re following. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : followingData?.relationships.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-xl font-semibold mb-2">Not Following Anyone</h3>
              <p className="text-muted-foreground mb-4">
                You&apos;re not following anyone yet. Discover interesting users to follow!
              </p>
              <Button onClick={() => router.push("/discover")}>
                <UserPlus className="h-4 w-4 mr-2" />
                Discover Users
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {followingData?.relationships.map((rel) => (
                <div
                  key={`${rel.follower}-${rel.following}`}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div 
                    className="flex items-center space-x-4 flex-1 cursor-pointer"
                    onClick={() => handleUserClick(rel.following)}
                  >
                    <Avatar
                      fallback={rel.following}
                      alt={rel.following}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg">
                        @{rel.following}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        You&apos;re following this user
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUserClick(rel.following)}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnfollow(rel.following)}
                      disabled={unfollowMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Unfollow
                    </Button>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasNextPage && (
                <div className="text-center pt-6">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Following'
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
