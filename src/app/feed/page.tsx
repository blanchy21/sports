'use client';

import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { Plus, TrendingUp, Users, Award, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { SPORT_CATEGORIES } from '@/types';
import { SportsblockPost } from '@/lib/shared/types';
import { CommunityStats } from '@/lib/hive-workerbee/analytics';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useFeedPosts } from '@/lib/react-query/queries/usePosts';
import { prefetchUserProfiles } from '@/features/user/hooks/useUserProfile';
import { prefetchStakedBalances } from '@/lib/premium/hooks';
import { logger } from '@/lib/logger';
import { interleaveAds } from '@/lib/utils/interleave-ads';

export default function FeedPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedSport, setSelectedSport] = React.useState<string>('');
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
    const allPosts = data.pages.flatMap((page) => page.posts);
    // Dedupe posts
    const seen = new Set<string>();
    return allPosts.filter((post) => {
      const key = `${post.author}/${post.permlink}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.pages]);

  // Prefetch user profiles and MEDALS balances for all authors in the feed
  // This reduces N+1 queries by batching requests at the feed level
  React.useEffect(() => {
    if (posts.length === 0) return;

    // Extract unique authors from posts
    const authors = [...new Set(posts.map((post) => post.author).filter(Boolean))];

    if (authors.length > 0) {
      // Batch prefetch both profiles and MEDALS balances
      // These run in parallel and populate React Query cache
      Promise.all([
        prefetchUserProfiles(authors, queryClient),
        prefetchStakedBalances(authors, queryClient),
      ]).catch((error) => {
        // Silent fail - individual hooks will fetch on their own
        console.warn('[Feed] Batch prefetch failed:', error);
      });
    }
  }, [posts, queryClient]);

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
        logger.error('Error calculating analytics', 'FeedPage', analyticsError);
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
  const stats = React.useMemo(
    () => [
      {
        label: 'Posts Today',
        value: statsLoading ? '...' : formatNumber(communityStats.activeToday),
        icon: TrendingUp,
      },
      {
        label: 'Active Users',
        value: statsLoading ? '...' : formatNumber(communityStats.totalAuthors),
        icon: Users,
      },
      {
        label: 'Total Rewards',
        value: statsLoading ? '...' : formatCurrency(communityStats.totalRewards),
        icon: Award,
      },
    ],
    [communityStats, statsLoading]
  );

  // Redirect if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  // Listen for sport filter changes from the navigation
  React.useEffect(() => {
    const handleSportFilterChange = (event: CustomEvent) => {
      setSelectedSport(event.detail);
    };

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
    return SPORT_CATEGORIES.find((sport) => sport.id === selectedSport)?.name;
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
    ? error instanceof Error
      ? error.message
      : 'Failed to load posts. Please try again later.'
    : null;

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Write Post Section */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center space-x-3">
            <Avatar
              src={user?.avatar}
              fallback={user?.username || '?'}
              alt={user?.displayName || user?.username || 'Guest'}
              size="md"
            />
            <div className="flex-1">
              <input
                type="text"
                placeholder="What's happening in sports today?"
                className="w-full cursor-pointer rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!user}
                onClick={() => user && router.push('/sportsbites')}
                readOnly
              />
            </div>
            <Button disabled={!user} onClick={() => router.push('/sportsbites')}>
              <Plus className="mr-2 h-4 w-4" />
              Sportsbite
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="rounded-lg border bg-card p-4">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {statsLoading ? (
                        <div className="h-8 w-16 animate-pulse rounded bg-gray-300 dark:bg-gray-600"></div>
                      ) : statsError ? (
                        <span className="text-lg text-red-500">Error</span>
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
                {selectedSportName ? `${selectedSportName} Posts` : 'Featured Posts'}
              </h2>
              {selectedSportName && (
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                  <span>{SPORT_CATEGORIES.find((s) => s.id === selectedSport)?.icon}</span>
                  <span>{selectedSportName}</span>
                  <button
                    onClick={() => setSelectedSport('')}
                    className="ml-1 text-primary/70 transition-colors hover:text-primary"
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
                <div key={i} className="animate-pulse rounded-lg border bg-card p-6">
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gray-300"></div>
                    <div className="flex-1">
                      <div className="mb-2 h-4 w-1/4 rounded bg-gray-300"></div>
                      <div className="h-3 w-1/3 rounded bg-gray-300"></div>
                    </div>
                  </div>
                  <div className="mb-3 h-6 w-3/4 rounded bg-gray-300"></div>
                  <div className="mb-2 h-4 w-full rounded bg-gray-300"></div>
                  <div className="h-4 w-2/3 rounded bg-gray-300"></div>
                </div>
              ))
            ) : errorMessage ? (
              <div className="py-12 text-center">
                <div className="mb-4 text-6xl">⚠️</div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  Error Loading Posts
                </h3>
                <p className="mb-6 text-gray-500 dark:text-gray-400">{errorMessage}</p>
                <Button onClick={() => refetch()}>Try Again</Button>
              </div>
            ) : filteredPosts.length > 0 ? (
              interleaveAds(
                filteredPosts.map((post) => (
                  <PostCard key={`${post.author}/${post.permlink}`} post={post} />
                ))
              )
            ) : (
              <div className="py-12 text-center">
                <div className="mb-4 text-6xl">
                  {selectedSport
                    ? SPORT_CATEGORIES.find((s) => s.id === selectedSport)?.icon
                    : '🏆'}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedSportName ? `No ${selectedSportName} posts yet` : 'No posts available'}
                </h3>
                <p className="mb-6 text-gray-500 dark:text-gray-400">
                  {selectedSportName
                    ? `Be the first to share something about ${selectedSportName}!`
                    : 'Check back later for new content.'}
                </p>
                <Button onClick={() => router.push('/publish')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Post
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Infinite Scroll Loading Indicator */}
        {isFetchingNextPage && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more posts...
            </div>
          </div>
        )}

        {/* End of feed indicator */}
        {!hasNextPage && posts.length > 0 && (
          <div className="mt-8 flex justify-center">
            <div className="text-sm text-muted-foreground">
              You&apos;ve reached the end of the feed
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
