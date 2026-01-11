"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowers } from "@/lib/react-query/queries/useFollowers";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MainLayout } from "@/components/layout/MainLayout";
import { Users, UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FollowersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const {
    data: followersData,
    isLoading,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage
  } = useFollowers(
    user?.username || '',
    { enabled: !!user?.username }
  );

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
        <div className="max-w-4xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Please sign in to view your followers</h2>
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
                <h1 className="text-3xl font-bold">Followers</h1>
                <p className="text-muted-foreground">
                  People who follow @{user.username}
                </p>
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
              <h3 className="text-xl font-semibold mb-2">Error Loading Followers</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading your followers. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : followersData?.relationships.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">No Followers Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven&apos;t gained any followers yet. Start posting great content to attract followers!
              </p>
              <Button onClick={() => router.push("/publish")}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Your First Post
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {followersData?.relationships.map((rel) => (
                <div
                  key={`${rel.follower}-${rel.following}`}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div 
                    className="flex items-center space-x-4 flex-1 cursor-pointer"
                    onClick={() => handleUserClick(rel.follower)}
                  >
                    <Avatar
                      fallback={rel.follower}
                      alt={rel.follower}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg">
                        @{rel.follower}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Started following you
                      </div>
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
