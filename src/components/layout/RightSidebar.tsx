'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, Users, Calendar, Trophy, Star, AlertCircle, RefreshCw } from 'lucide-react';
import { useRealtimeEvents } from '@/features/sports/hooks/useUpcomingEvents';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowUser, useUnfollowUser } from '@/lib/react-query/queries/useFollowers';
import { useBatchFollowStatus } from '@/lib/react-query/queries/useUserProfile';
import { useSidebarAnalytics } from '@/lib/react-query/queries/useSidebarAnalytics';
import { Avatar } from '@/components/core/Avatar';

export const RightSidebar: React.FC = () => {
  const { user } = useAuth();

  // Use React Query for analytics data - cached across navigations
  const { data: analyticsData, isLoading, error: analyticsError } = useSidebarAnalytics();

  // Extract data from cached query
  const trendingSports = analyticsData?.trendingSports || [];
  const trendingTopics = analyticsData?.trendingTopics || [];
  const topAuthors = analyticsData?.topAuthors || [];
  const communityStats = analyticsData?.communityStats || {
    totalPosts: 0,
    totalAuthors: 0,
    totalRewards: 0,
    activeToday: 0,
  };

  // Convert error to string for display
  const error = analyticsError ? 'Failed to load sidebar data' : null;

  // Follow/unfollow mutations
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  // Batch follow status query for all top authors
  const hiveFollower = user?.isHiveAuth ? user.hiveUsername || user.username : '';
  const authorUsernames = topAuthors.map((a) => a.username);
  const { data: followStatusMap } = useBatchFollowStatus(authorUsernames, hiveFollower);

  // Filter out authors the user already follows (for Hive-authenticated users)
  const suggestedAuthors =
    hiveFollower && followStatusMap
      ? topAuthors.filter(
          (a) =>
            a.username !== user?.username &&
            a.username !== user?.hiveUsername &&
            !followStatusMap[a.username]
        )
      : topAuthors;

  // Follow button component - receives follow state as prop from batch query
  const FollowButton: React.FC<{ username: string; isFollowing: boolean }> = ({
    username,
    isFollowing,
  }) => {
    const handleFollowToggle = async () => {
      if (!user?.username) return;

      try {
        if (isFollowing) {
          await unfollowMutation.mutateAsync({
            username,
            follower: user.username,
          });
        } else {
          await followMutation.mutateAsync({
            username,
            follower: user.username,
          });
        }
      } catch (error) {
        console.error('Error toggling follow status:', error);
      }
    };

    const isMutating = followMutation.isPending || unfollowMutation.isPending;

    return (
      <button
        onClick={handleFollowToggle}
        disabled={isMutating}
        className={`rounded-md px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
          isFollowing
            ? 'bg-muted text-muted-foreground hover:bg-muted/80'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {isMutating ? '...' : isFollowing ? 'Following' : 'Follow'}
      </button>
    );
  };

  // Real-time events data
  const {
    events: upcomingEvents,
    isLoading: eventsLoading,
    error: eventsError,
    refreshEvents,
    isRefreshing,
    lastUpdated,
  } = useRealtimeEvents({ limit: 5 });

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="mb-2 h-4 rounded bg-muted"></div>
      <div className="space-y-2">
        <div className="h-3 rounded bg-muted"></div>
        <div className="h-3 rounded bg-muted"></div>
        <div className="h-3 rounded bg-muted"></div>
      </div>
    </div>
  );

  return (
    <aside className="hidden bg-background xl:fixed xl:right-0 xl:top-20 xl:flex xl:h-[calc(100vh-5rem)] xl:w-80 xl:flex-col xl:overflow-y-auto xl:border-l xl:p-4 2xl:top-24 2xl:h-[calc(100vh-6rem)] 2xl:w-[28rem] 2xl:p-6">
      <div className="space-y-6">
        {/* Trending Topics */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Trending Topics</h3>
          </div>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Unable to load topics</span>
            </div>
          ) : trendingTopics.length > 0 ? (
            <>
              <div className="space-y-3">
                {trendingTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-accent"
                  >
                    <div>
                      <div className="text-sm font-medium">#{topic.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {topic.posts.toLocaleString()} posts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full text-sm text-primary hover:underline">
                Show more
              </button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No trending topics found</div>
          )}
        </div>

        {/* Trending Sports */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center space-x-2">
            <Star className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Trending Sports</h3>
          </div>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Unable to load sports</span>
            </div>
          ) : trendingSports.length > 0 ? (
            <div className="space-y-3">
              {trendingSports.map((item) => (
                <div
                  key={item.sport.id}
                  className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{item.sport.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{item.sport.name}</div>
                      <div className="text-xs text-muted-foreground">{item.posts} posts</div>
                    </div>
                  </div>
                  {item.trending && (
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-accent" />
                      <span className="text-xs text-accent">Hot</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No sports data found</div>
          )}
        </div>

        {/* Top Authors */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Top Authors</h3>
          </div>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Unable to load authors</span>
            </div>
          ) : suggestedAuthors.length > 0 ? (
            <>
              <div className="space-y-3">
                {suggestedAuthors.map((author) => (
                  <div
                    key={author.id}
                    className="flex cursor-pointer items-center space-x-3 rounded-md p-2 transition-colors hover:bg-accent"
                  >
                    <Avatar
                      src={`https://images.hive.blog/u/${author.username}/avatar`}
                      fallback={author.displayName || author.username}
                      alt={author.displayName || author.username}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{author.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        @{author.username} • {author.posts} posts
                      </div>
                    </div>
                    {user?.isHiveAuth && (
                      <FollowButton username={author.username} isFollowing={false} />
                    )}
                  </div>
                ))}
              </div>
              <Link
                href="/authors"
                className="mt-3 block w-full text-center text-sm text-primary hover:underline"
              >
                View all authors
              </Link>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No authors found</div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Upcoming Events</h3>
            </div>
            <button
              onClick={refreshEvents}
              disabled={isRefreshing}
              className="rounded-md p-1 transition-colors hover:bg-accent disabled:opacity-50"
              title="Refresh events"
            >
              <RefreshCw
                className={`h-4 w-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {eventsLoading ? (
            <LoadingSkeleton />
          ) : eventsError ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Unable to load events</span>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <>
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const eventDate = new Date(event.date);
                  const now = new Date();
                  const diffMs = eventDate.getTime() - now.getTime();
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                  // Format relative time
                  let timeDisplay: string;
                  if (event.status === 'live') {
                    timeDisplay = '';
                  } else if (diffMs < 0) {
                    timeDisplay = 'Starting soon';
                  } else if (diffHours < 1) {
                    timeDisplay = `In ${diffMins}m`;
                  } else if (diffHours < 24) {
                    timeDisplay = `In ${diffHours}h ${diffMins > 0 ? `${diffMins}m` : ''}`.trim();
                  } else {
                    timeDisplay = eventDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    });
                  }

                  return (
                    <div
                      key={event.id}
                      className={`flex cursor-pointer items-start space-x-3 rounded-md p-2 transition-colors hover:bg-accent ${
                        event.status === 'live' ? 'border border-red-500/20 bg-red-500/5' : ''
                      }`}
                    >
                      <div className="text-2xl">{event.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {event.status === 'live' && (
                            <span className="inline-flex animate-pulse items-center gap-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                              Live
                            </span>
                          )}
                          <span className="truncate text-sm font-medium">
                            {event.league || event.sport}
                          </span>
                        </div>
                        {event.teams ? (
                          <div className="mt-0.5 text-xs text-foreground">
                            {event.teams.home} vs {event.teams.away}
                          </div>
                        ) : (
                          <div className="mt-0.5 truncate text-xs text-foreground">
                            {event.name}
                          </div>
                        )}
                        {timeDisplay && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{timeDisplay}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {lastUpdated && (
                <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No upcoming events found</div>
          )}
        </div>

        {/* Stats Card */}
        <div className="rounded-lg bg-gradient-to-r from-primary via-bright-cobalt to-accent p-4 text-white">
          <div className="mb-3 flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <h3 className="text-base font-semibold">Community Stats</h3>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 animate-pulse rounded bg-white/20"></div>
              <div className="h-4 animate-pulse rounded bg-white/20"></div>
              <div className="h-4 animate-pulse rounded bg-white/20"></div>
            </div>
          ) : error ? (
            <div className="text-sm opacity-75">Unable to load stats</div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm opacity-90">Total Posts (7d)</span>
                <span className="font-bold">{communityStats.totalPosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm opacity-90">Active Authors</span>
                <span className="font-bold">{communityStats.totalAuthors.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm opacity-90">Total Rewards</span>
                <span className="font-bold">${communityStats.totalRewards.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Link href="/legal/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <span>·</span>
          <Link href="/legal/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/legal/cookies" className="transition-colors hover:text-foreground">
            Cookies
          </Link>
          <span>·</span>
          <Link
            href="/legal/community-guidelines"
            className="transition-colors hover:text-foreground"
          >
            Guidelines
          </Link>
        </div>
      </div>
    </aside>
  );
};
