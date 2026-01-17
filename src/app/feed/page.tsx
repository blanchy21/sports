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

// No mock data needed - using real Hive blockchain content

export default function FeedPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [selectedSport, setSelectedSport] = React.useState<string>("");
  const [posts, setPosts] = React.useState<SportsblockPost[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const nextCursorRef = React.useRef<string | undefined>(undefined);
  const [communityStats, setCommunityStats] = React.useState<CommunityStats>({
    totalPosts: 0,
    totalAuthors: 0,
    totalRewards: 0,
    activeToday: 0,
  });
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);

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

  // Set up infinite scroll
  useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: () => loadPosts(true),
  });

  const resetPagination = React.useCallback(() => {
    setNextCursor(undefined);
    nextCursorRef.current = undefined;
    setHasMore(false);
  }, []);

  const getPostKey = React.useCallback((post: SportsblockPost) => {
    return `${post.author}/${post.permlink}`;
  }, []);

  const dedupePosts = React.useCallback((postList: SportsblockPost[]) => {
    const seen = new Set<string>();
    return postList.filter((post) => {
      const key = getPostKey(post);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [getPostKey]);

  const loadPosts = React.useCallback(async (loadMore = false) => {
    const cursor = loadMore ? nextCursorRef.current : undefined;
    if (loadMore && !cursor) {
      return;
    }

    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setStatsLoading(true);
      setError(null);
      setStatsError(null);
    }
    
    try {
      const params = new URLSearchParams({
        limit: '10',
        sort: 'created',
      });
      if (selectedSport) params.append('sportCategory', selectedSport);
      if (loadMore && cursor) params.append('before', cursor);
      
      const response = await fetch(`/api/hive/posts?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }
      const result = await response.json() as { success: boolean; posts: SportsblockPost[]; hasMore: boolean; nextCursor?: string };
      
      setPosts((prev) => {
        const merged = loadMore ? [...prev, ...result.posts] : result.posts;
        return dedupePosts(merged);
      });
      
      // Update pagination state
      setNextCursor(result.nextCursor);
      nextCursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
      
      // Calculate analytics data from all posts (not filtered by sport)
      // Use the posts we just fetched instead of making another API call
      if (!loadMore) {
        try {
          // Use the posts we just fetched for analytics
          const postsForAnalytics = result.posts || [];
          
          if (postsForAnalytics.length > 0) {
            const { getAnalyticsData } = await import('@/lib/hive-workerbee/analytics');
            // Type assertion needed due to interface differences between local and imported types
            const analytics = getAnalyticsData(postsForAnalytics as unknown as Parameters<typeof getAnalyticsData>[0], user?.username);
            setCommunityStats(analytics.communityStats);
          } else {
            // If no posts in this batch, set default stats
            setCommunityStats({
              totalPosts: 0,
              totalAuthors: 0,
              totalRewards: 0,
              activeToday: 0,
            });
          }
          setStatsLoading(false);
        } catch (analyticsError) {
          console.error('Error calculating analytics:', analyticsError);
          setStatsError('Failed to load statistics');
          setStatsLoading(false);
          // Keep default stats values
        }
      }
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts. Please try again later.');
      setStatsError('Failed to load statistics');
      // No fallback to mock data - show empty state instead
      if (!loadMore) {
        setPosts([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setStatsLoading(false);
    }
  }, [selectedSport, dedupePosts, user?.username]);

  // Redirect if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  // Load posts from Hive blockchain
  React.useEffect(() => {
    loadPosts();
  }, [selectedSport, loadPosts]);

  // Listen for sport filter changes from the navigation
  React.useEffect(() => {
    const handleSportFilterChange = (event: CustomEvent) => {
      setSelectedSport(event.detail);
      // Reset pagination when sport filter changes
      resetPagination();
    };

    // Load saved sport filter from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const savedSport = localStorage.getItem('selectedSport');
        if (savedSport) {
          setSelectedSport(savedSport);
          // Reset pagination when loading saved filter
          resetPagination();
        }
      } catch (error) {
        console.error('Error loading saved sport filter:', error);
      }
    }

    window.addEventListener('sportFilterChanged', handleSportFilterChange as EventListener);
    
    return () => {
      window.removeEventListener('sportFilterChanged', handleSportFilterChange as EventListener);
    };
  }, []);

  // Filter posts based on selected sport
  const filteredPosts = React.useMemo(() => {
    if (!selectedSport) {
      return posts;
    }
    return posts.filter(post => post.sportCategory === selectedSport);
  }, [posts, selectedSport]);

  // Get the selected sport name for display
  const selectedSportName = React.useMemo(() => {
    if (!selectedSport) return null;
    return SPORT_CATEGORIES.find(sport => sport.id === selectedSport)?.name;
  }, [selectedSport]);

  // Show nothing while auth is loading or if user is not authenticated (will redirect)
  if (isAuthLoading || !user) {
    return null;
  }

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
                onClick={() => user && router.push("/publish")}
                readOnly
              />
            </div>
            <Button 
              disabled={!user}
              onClick={() => router.push("/publish")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Post
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
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Error Loading Posts
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {error}
                </p>
                <Button onClick={() => loadPosts(false)}>
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
        {isLoadingMore && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more posts...
            </div>
          </div>
        )}
        
        {/* End of feed indicator */}
        {!hasMore && posts.length > 0 && (
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

