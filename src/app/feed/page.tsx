'use client';

import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { Plus, TrendingUp, Users, Award, Loader2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { CommunityStats } from '@/lib/hive-workerbee/analytics';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useFeedPosts, useFollowingFeedPosts } from '@/lib/react-query/queries/usePosts';
import { prefetchUserProfiles } from '@/lib/react-query/queries/useUserProfile';
import { prefetchStakedBalances } from '@/lib/premium/hooks';
import { logger } from '@/lib/logger';
import { interleaveAds } from '@/lib/utils/interleave-ads';

type FeedMode = 'community' | 'following';

export default function FeedPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [feedMode, setFeedMode] = React.useState<FeedMode>('community');
  const [communityStats, setCommunityStats] = React.useState<CommunityStats>({
    totalPosts: 0,
    totalAuthors: 0,
    totalRewards: 0,
    activeToday: 0,
  });
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  // Community feed (existing)
  const communityFeed = useFeedPosts({
    enabled: !isAuthLoading && !!user && feedMode === 'community',
  });

  // Following feed (new)
  const followingFeed = useFollowingFeedPosts({
    username: user?.hiveUsername || user?.username,
    enabled: !isAuthLoading && !!user && feedMode === 'following',
  });

  // Select active feed based on mode
  const activeFeed = feedMode === 'community' ? communityFeed : followingFeed;
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = activeFeed;

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
  React.useEffect(() => {
    if (posts.length === 0) return;

    const authors = [...new Set(posts.map((post) => post.author).filter(Boolean))];

    if (authors.length > 0) {
      Promise.all([
        prefetchUserProfiles(authors, queryClient),
        prefetchStakedBalances(authors, queryClient),
      ]).catch((error) => {
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

  // Calculate analytics when first page loads (community feed only)
  React.useEffect(() => {
    if (feedMode !== 'community') return;

    const calculateAnalytics = async () => {
      if (!communityFeed.data?.pages?.[0]?.posts?.length) {
        setStatsLoading(false);
        return;
      }

      try {
        const postsForAnalytics = communityFeed.data.pages[0].posts;
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

    if (communityFeed.data?.pages?.[0]) {
      calculateAnalytics();
    }
  }, [communityFeed.data?.pages, user?.username, feedMode]);

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
      const timer = setTimeout(() => {
        router.push('/');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading) {
    return null;
  }

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

        {/* Feed Mode Tabs */}
        <div className="flex rounded-lg border border-border p-1">
          <button
            onClick={() => setFeedMode('community')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              feedMode === 'community'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <TrendingUp className="h-4 w-4" />
            For You
          </button>
          <button
            onClick={() => setFeedMode('following')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              feedMode === 'following'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <UserCheck className="h-4 w-4" />
            Following
          </button>
        </div>

        {/* Stats (community mode only) */}
        {feedMode === 'community' && (
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
                          <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                        ) : statsError ? (
                          <span className="text-lg text-destructive">Error</span>
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
        )}

        {/* Posts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {feedMode === 'community' ? 'Featured Posts' : 'From People You Follow'}
            </h2>
            {feedMode === 'community' && (
              <Button variant="outline" size="sm">
                View All
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border bg-card p-6">
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-muted"></div>
                    <div className="flex-1">
                      <div className="mb-2 h-4 w-1/4 rounded bg-muted"></div>
                      <div className="h-3 w-1/3 rounded bg-muted"></div>
                    </div>
                  </div>
                  <div className="mb-3 h-6 w-3/4 rounded bg-muted"></div>
                  <div className="mb-2 h-4 w-full rounded bg-muted"></div>
                  <div className="h-4 w-2/3 rounded bg-muted"></div>
                </div>
              ))
            ) : errorMessage ? (
              <div className="py-12 text-center">
                <div className="mb-4 text-6xl">⚠️</div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">Error Loading Posts</h3>
                <p className="mb-6 text-muted-foreground">{errorMessage}</p>
                <Button onClick={() => refetch()}>Try Again</Button>
              </div>
            ) : posts.length > 0 ? (
              interleaveAds(
                posts.map((post) => (
                  <PostCard key={`${post.author}/${post.permlink}`} post={post} />
                ))
              )
            ) : feedMode === 'following' ? (
              <div className="py-12 text-center">
                <div className="mb-4 text-6xl">👥</div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  No posts from people you follow
                </h3>
                <p className="mb-6 text-muted-foreground">
                  Follow some creators to see their posts here, or check out the community feed.
                </p>
                <Button onClick={() => setFeedMode('community')}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Browse Community Feed
                </Button>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mb-4 text-6xl">🏆</div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">No posts available</h3>
                <p className="mb-6 text-muted-foreground">Check back later for new content.</p>
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
