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
import { MyCommunitiesWidget } from '@/components/community/MyCommunitiesWidget';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { logger } from '@/lib/logger';

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

  // Filter out the current user from top authors (don't suggest following yourself)
  const displayedAuthors = topAuthors.filter(
    (a) => a.username !== user?.username && a.username !== user?.hiveUsername
  );

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
        logger.error('Error toggling follow status', 'RightSidebar', error);
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
      <div className="bg-muted mb-2 h-4 rounded"></div>
      <div className="space-y-2">
        <div className="bg-muted h-3 rounded"></div>
        <div className="bg-muted h-3 rounded"></div>
        <div className="bg-muted h-3 rounded"></div>
      </div>
    </div>
  );

  return (
    <aside className="bg-background hidden xl:fixed xl:top-20 xl:right-0 xl:flex xl:h-[calc(100vh-5rem)] xl:w-80 xl:flex-col xl:overflow-y-auto xl:border-l xl:p-4 2xl:top-24 2xl:h-[calc(100vh-6rem)] 2xl:w-md 2xl:p-6">
      <div className="space-y-6">
        {/* My Communities */}
        <MyCommunitiesWidget maxItems={5} className="bg-card rounded-lg border p-4" />

        {/* Trending Topics */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center space-x-2">
            <TrendingUp className="text-primary h-5 w-5" />
            <h3 className="text-base font-semibold">Trending Topics</h3>
          </div>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-muted-foreground flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Unable to load topics</span>
            </div>
          ) : trendingTopics.length > 0 ? (
            <>
              <div className="space-y-3">
                {trendingTopics.slice(0, 5).map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/sportsbites?tag=${encodeURIComponent(topic.name)}`}
                    className="hover:bg-accent flex items-center justify-between rounded-md p-2 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium">#{topic.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {topic.posts.toLocaleString()} {topic.posts === 1 ? 'bite' : 'bites'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/sportsbites"
                className="text-primary mt-3 block w-full text-center text-sm hover:underline"
              >
                Show more
              </Link>
            </>
          ) : (
            <div className="text-muted-foreground text-sm">No trending topics found</div>
          )}
        </div>

        {/* Trending Sports */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center space-x-2">
            <Star className="text-primary h-5 w-5" />
            <h3 className="text-base font-semibold">Trending Sports</h3>
          </div>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-muted-foreground flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Unable to load sports</span>
            </div>
          ) : trendingSports.length > 0 ? (
            <div className="space-y-3">
              {trendingSports.map((item) => (
                <Link
                  key={item.sport.id}
                  href={`/discover?sportCategory=${item.sport.id}`}
                  className="hover:bg-accent flex items-center justify-between rounded-md p-2 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{item.sport.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{item.sport.name}</div>
                      <div className="text-muted-foreground text-xs">{item.posts} posts</div>
                    </div>
                  </div>
                  {item.trending && (
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="text-accent h-3 w-3" />
                      <span className="text-accent text-xs">Hot</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No sports data found</div>
          )}
        </div>

        {/* Top Authors */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center space-x-2">
            <Users className="text-primary h-5 w-5" />
            <h3 className="text-base font-semibold">Top Authors</h3>
          </div>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-muted-foreground flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Unable to load authors</span>
            </div>
          ) : displayedAuthors.length > 0 ? (
            <>
              <div className="space-y-3">
                {displayedAuthors.map((author) => (
                  <div
                    key={author.id}
                    className="hover:bg-accent flex cursor-pointer items-center space-x-3 rounded-md p-2 transition-colors"
                  >
                    <Avatar
                      src={getHiveAvatarUrl(author.username)}
                      fallback={author.displayName || author.username}
                      alt={author.displayName || author.username}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{author.displayName}</div>
                      <div className="text-muted-foreground text-xs">
                        @{author.username} • {author.posts} posts
                      </div>
                    </div>
                    {user?.isHiveAuth && (
                      <FollowButton
                        username={author.username}
                        isFollowing={followStatusMap?.[author.username] ?? false}
                      />
                    )}
                  </div>
                ))}
              </div>
              <Link
                href="/authors"
                className="text-primary mt-3 block w-full text-center text-sm hover:underline"
              >
                View all authors
              </Link>
            </>
          ) : (
            <div className="text-muted-foreground text-sm">No authors found</div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="text-primary h-5 w-5" />
              <h3 className="text-base font-semibold">Upcoming Events</h3>
            </div>
            <button
              onClick={refreshEvents}
              disabled={isRefreshing}
              className="hover:bg-accent rounded-md p-1 transition-colors disabled:opacity-50"
              title="Refresh events"
            >
              <RefreshCw
                className={`text-muted-foreground h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {eventsLoading ? (
            <LoadingSkeleton />
          ) : eventsError ? (
            <div className="text-muted-foreground flex items-center space-x-2">
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
                      className={`hover:bg-accent flex cursor-pointer items-start space-x-3 rounded-md p-2 transition-colors ${
                        event.status === 'live' ? 'border border-red-500/20 bg-red-500/5' : ''
                      }`}
                    >
                      <div className="text-2xl">{event.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {event.status === 'live' && (
                            <span className="inline-flex animate-pulse items-center gap-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                              Live
                            </span>
                          )}
                          <span className="truncate text-sm font-medium">
                            {event.league || event.sport}
                          </span>
                        </div>
                        {event.teams ? (
                          <div className="text-foreground mt-0.5 text-xs">
                            {event.teams.home} vs {event.teams.away}
                          </div>
                        ) : (
                          <div className="text-foreground mt-0.5 truncate text-xs">
                            {event.name}
                          </div>
                        )}
                        {timeDisplay && (
                          <div className="text-muted-foreground mt-0.5 text-xs">{timeDisplay}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {lastUpdated && (
                <div className="text-muted-foreground mt-3 border-t pt-2 text-xs">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground text-sm">No upcoming events found</div>
          )}
        </div>

        {/* Stats Card */}
        <div className="from-primary via-bright-cobalt to-accent rounded-lg bg-linear-to-r p-4 text-white">
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
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <span>·</span>
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/legal/cookies" className="hover:text-foreground transition-colors">
            Cookies
          </Link>
          <span>·</span>
          <Link
            href="/legal/community-guidelines"
            className="hover:text-foreground transition-colors"
          >
            Guidelines
          </Link>
        </div>
      </div>
    </aside>
  );
};
