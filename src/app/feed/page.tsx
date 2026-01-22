"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Plus, TrendingUp, Users, Award, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { SPORT_CATEGORIES } from "@/types";
import { SportsblockPost } from "@/lib/shared/types";
import { CommunityStats } from "@/lib/hive-workerbee/analytics";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useFeedPosts } from "@/lib/react-query/queries/usePosts";

export default function FeedPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [selectedSport, setSelectedSport] = React.useState<string>("");
  const [communityStats, setCommunityStats] = React.useState<CommunityStats>({
    totalPosts: 0,
    totalAuthors: 0,
    totalRewards: 0,
    activeToday: 0,
  });
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  // Use React Query for feed posts with caching
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useFeedPosts({
    sportCategory: selectedSport || undefined,
    enabled: !isAuthLoading && !!user,
  });

  // Flatten paginated data into a single array
  const posts = React.useMemo(() => {
    if (!data?.pages) return [];
    const allPosts = data.pages.flatMap(page => page.posts);
    // Dedupe posts
    const seen = new Set<string>();
    return allPosts.filter(post => {
      const key = `${post.author}/${post.permlink}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.pages]);

  // Memoized callback for infinite scroll
  const handleLoadMore = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Set up infinite scroll
  useInfiniteScroll({
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: handleLoadMore,
  });

  // Calculate analytics when first page loads
  React.useEffect(() => {
    const calculateAnalytics = async () => {
      if (!data?.pages?.[0]?.posts?.length) {
        setStatsLoading(false);
        return;
      }

      try {
        const postsForAnalytics = data.pages[0].posts;
        const { getAnalyticsData } = await import('@/lib/hive-workerbee/analytics');
        const analytics = await getAnalyticsData(
          postsForAnalytics as unknown as Parameters<typeof getAnalyticsData>[0],
          user?.username
        );
        setCommunityStats(analytics.communityStats);
        setStatsError(null);
      } catch (analyticsError) {
        console.error('Error calculating analytics:', analyticsError);
        setStatsError('Failed to load statistics');
      } finally {
        setStatsLoading(false);
      }
    };

    if (data?.pages?.[0]) {
      calculateAnalytics();
    }
  }, [data?.pages, user?.username]);

  // Utility function to format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Utility function to format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(1) + 'K';
    }
    return '$' + amount.toFixed(2);
  };

  // Dynamic stats based on real data
  const stats = React.useMemo(() => [
    {
      label: "Posts Today",
      value: statsLoading ? "..." : formatNumber(communityStats.activeToday),
      icon: TrendingUp
    },
    {
      label: "Active Users",
      value: statsLoading ? "..." : formatNumber(communityStats.totalAuthors),
      icon: Users
    },
    {
      label: "Total Rewards",
      value: statsLoading ? "..." : formatCurrency(communityStats.totalRewards),
      icon: Award
    },
  ], [communityStats, statsLoading]);

  // Redirect if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  // Listen for sport filter changes from the navigation
  React.useEffect(() => {
    const handleSportFilterChange = (event: CustomEvent) => {
      setSelectedSport(event.detail);
    };

    // Load saved sport filter from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const savedSport = localStorage.getItem('selectedSport');
        if (savedSport) {
          setSelectedSport(savedSport);
        }
      } catch (err) {
        console.error('Error loading saved sport filter:', err);
      }
    }

    window.addEventListener('sportFilterChanged', handleSportFilterChange as EventListener);

    return () => {
      window.removeEventListener('sportFilterChanged', handleSportFilterChange as EventListener);
    };
  }, []);

  // Filter posts based on selected sport (client-side filter for cached data)
  const filteredPosts = React.useMemo(() => {
    if (!selectedSport) {
      return posts;
    }
    return posts.filter((post: SportsblockPost) => post.sportCategory === selectedSport);
  }, [posts, selectedSport]);

  // Get the selected sport name for display
  const selectedSportName = React.useMemo(() => {
    if (!selectedSport) return null;
    return SPORT_CATEGORIES.find(sport => sport.id === selectedSport)?.name;
  }, [selectedSport]);

  // Show skeleton while auth is loading (handled by loading.tsx for initial load)
  if (isAuthLoading) {
    return null;
  }

  // User not authenticated - will redirect
  if (!user) {
    return null;
  }

  const errorMessage = isError
    ? (error instanceof Error ? error.message : 'Failed to load posts. Please try again later.')
    : null;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Write Post Section */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Avatar
              src={user?.avatar}
              fallback={user?.username || "?"}
              alt={user?.displayName || user?.username || "Guest"}
              size="md"
            />
            <div className="flex-1">
              <input
                type="text"
                placeholder="What's happening in sports today?"
                className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                disabled={!user}
                onClick={() => user && router.push("/shorts")}
                readOnly
              />
            </div>
            <Button
              disabled={!user}
              onClick={() => router.push("/shorts")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Short
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {statsLoading ? (
                        <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                      ) : statsError ? (
                        <span className="text-red-500 text-lg">Error</span>
                      ) : (
                        stat.value
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Featured Posts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                {selectedSportName ? `${selectedSportName} Posts` : "Featured Posts"}
              </h2>
              {selectedSportName && (
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  <span>{SPORT_CATEGORIES.find(s => s.id === selectedSport)?.icon}</span>
                  <span>{selectedSportName}</span>
                  <button
                    onClick={() => setSelectedSport("")}
                    className="ml-1 text-primary/70 hover:text-primary transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          <div className="space-y-6">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                </div>
              ))
            ) : errorMessage ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Error Loading Posts
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {errorMessage}
                </p>
                <Button onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <PostCard key={`${post.author}/${post.permlink}`} post={post} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {selectedSport ? SPORT_CATEGORIES.find(s => s.id === selectedSport)?.icon : "🏆"}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedSportName ? `No ${selectedSportName} posts yet` : "No posts available"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {selectedSportName
                    ? `Be the first to share something about ${selectedSportName}!`
                    : "Check back later for new content."
                  }
                </p>
                <Button onClick={() => router.push("/publish")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Infinite Scroll Loading Indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more posts...
            </div>
          </div>
        )}

        {/* End of feed indicator */}
        {!hasNextPage && posts.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="text-muted-foreground text-sm">
              You&apos;ve reached the end of the feed
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
