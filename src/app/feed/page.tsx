"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Plus, TrendingUp, Users, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Post, SPORT_CATEGORIES } from "@/types";
import { fetchSportsblockPosts, SportsblockPost } from "@/lib/hive-workerbee/content";
import { getAnalyticsData, CommunityStats } from "@/lib/hive-workerbee/analytics";

// No mock data needed - using real Hive blockchain content

export default function FeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedSport, setSelectedSport] = React.useState<string>("");
  const [posts, setPosts] = React.useState<SportsblockPost[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
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

  const loadPosts = React.useCallback(async () => {
    setIsLoading(true);
    setStatsLoading(true);
    setError(null);
    setStatsError(null);
    
    try {
      const result = await fetchSportsblockPosts({
        sportCategory: selectedSport || undefined,
        limit: 100, // Get more posts for better analytics
        sort: 'created',
      });
      
      setPosts(result.posts);
      
      // Calculate analytics data from all posts (not filtered by sport)
      try {
        const allPostsResult = await fetchSportsblockPosts({
          limit: 100,
          sort: 'created',
        });
        
        const analytics = getAnalyticsData(allPostsResult.posts);
        setCommunityStats(analytics.communityStats);
      } catch (analyticsError) {
        console.error('Error calculating analytics:', analyticsError);
        setStatsError('Failed to load statistics');
        // Keep default stats values
      }
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Failed to load posts. Please try again later.');
      setStatsError('Failed to load statistics');
      // No fallback to mock data - show empty state instead
      setPosts([]);
    } finally {
      setIsLoading(false);
      setStatsLoading(false);
    }
  }, [selectedSport]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  // Load posts from Hive blockchain
  React.useEffect(() => {
    loadPosts();
  }, [selectedSport, loadPosts]);

  // Listen for sport filter changes from the navigation
  React.useEffect(() => {
    const handleSportFilterChange = (event: CustomEvent) => {
      setSelectedSport(event.detail);
    };

    // Load saved sport filter from localStorage
    const savedSport = localStorage.getItem('selectedSport');
    if (savedSport) {
      setSelectedSport(savedSport);
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

  if (!user) {
    return null; // Will redirect
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
                <Button onClick={loadPosts}>
                  Try Again
                </Button>
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <PostCard key={`${post.author}/${post.permlink}`} post={post as unknown as Post} />
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

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline" size="lg">
            Load More Posts
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}

