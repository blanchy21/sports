"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Users, Calendar, Trophy, Star, AlertCircle, RefreshCw } from "lucide-react";
import { 
  TrendingSport, 
  TrendingTopic, 
  TopAuthor, 
  CommunityStats 
} from "@/lib/hive-workerbee/analytics";
import { useRealtimeEvents } from "@/hooks/useUpcomingEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowUser, useUnfollowUser } from "@/lib/react-query/queries/useFollowers";
import { useIsFollowingUser } from "@/lib/react-query/queries/useUserProfile";

export const RightSidebar: React.FC = () => {
  const { user } = useAuth();
  
  // State for dynamic data
  const [trendingSports, setTrendingSports] = useState<TrendingSport[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [topAuthors, setTopAuthors] = useState<TopAuthor[]>([]);
  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    totalPosts: 0,
    totalAuthors: 0,
    totalRewards: 0,
    activeToday: 0,
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Follow/unfollow mutations
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  // Follow button component
  const FollowButton: React.FC<{ username: string }> = ({ username }) => {
    const { data: isFollowing } = useIsFollowingUser(username, user?.username || '');
    const [isFollowingState, setIsFollowingState] = useState(false);
    const [hasAttemptedFollow, setHasAttemptedFollow] = useState(false);

    // Only update local state from API if we haven't made any local changes
    // Since the API always returns false, we'll rely on local state management
    useEffect(() => {
      // Only set from API if we haven't attempted any follow operations
      if (!hasAttemptedFollow) {
        setIsFollowingState(isFollowing || false);
      }
    }, [isFollowing, hasAttemptedFollow]);

    const handleFollowToggle = async () => {
      if (!user?.username) return;

      try {
        if (isFollowingState) {
          await unfollowMutation.mutateAsync({
            username,
            follower: user.username
          });
          setIsFollowingState(false);
          setHasAttemptedFollow(false);
        } else {
          await followMutation.mutateAsync({
            username,
            follower: user.username
          });
          setIsFollowingState(true);
          setHasAttemptedFollow(true);
        }
      } catch (error) {
        console.error('Error toggling follow status:', error);
        // Reset state on error
        setHasAttemptedFollow(false);
      }
    };

    const isLoading = followMutation.isPending || unfollowMutation.isPending;

    // Use optimistic state: prioritize hasAttemptedFollow for successful operations
    const displayState = hasAttemptedFollow || isFollowingState;

    return (
      <button 
        onClick={handleFollowToggle}
        disabled={isLoading}
        className={`px-3 py-1 text-xs rounded-md transition-colors disabled:opacity-50 ${
          displayState 
            ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {isLoading ? '...' : displayState ? 'Following' : 'Follow'}
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
    lastUpdated 
  } = useRealtimeEvents({ limit: 5 });

  // Fetch analytics from layer 2 database
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/analytics', {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.status}`);
        }
        
        const apiResult = await response.json();
        if (!apiResult.success) {
          throw new Error(apiResult.error || 'Failed to fetch analytics');
        }
        
        // Set analytics data from layer 2
        const analytics = apiResult.data;
        setTrendingSports(analytics.trendingSports || []);
        setTrendingTopics(analytics.trendingTopics || []);
        setTopAuthors(analytics.topAuthors || []);
        setCommunityStats(analytics.communityStats || {
          totalPosts: 0,
          totalAuthors: 0,
          totalRewards: 0,
          activeToday: 0,
        });
        
      } catch (err) {
        // Ignore abort errors (expected when component unmounts or timeout)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Error fetching analytics data:', err);
        setError('Failed to load sidebar data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();

    // Cleanup: abort fetch and clear timeout on unmount
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user?.username]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-muted rounded mb-2"></div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded"></div>
      </div>
    </div>
  );

  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-[28rem] xl:fixed xl:right-0 xl:top-20 xl:h-[calc(100vh-5rem)] xl:overflow-y-auto xl:border-l bg-background xl:p-6">
      <div className="space-y-6">
        {/* Trending Topics */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Trending Topics</h3>
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
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-sm">#{topic.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {topic.posts.toLocaleString()} posts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 text-sm text-primary hover:underline">
                Show more
              </button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No trending topics found</div>
          )}
        </div>

        {/* Trending Sports */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Star className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Trending Sports</h3>
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
                <div key={item.sport.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{item.sport.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{item.sport.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.posts} posts
                      </div>
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
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Top Authors</h3>
          </div>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Unable to load authors</span>
            </div>
          ) : topAuthors.length > 0 ? (
            <>
              <div className="space-y-3">
                {topAuthors.map((author) => (
                  <div
                    key={author.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {author.displayName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {author.displayName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{author.username} • {author.posts} posts
                      </div>
                    </div>
                    <FollowButton username={author.username} />
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 text-sm text-primary hover:underline">
                View all authors
              </button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No authors found</div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Upcoming Events</h3>
            </div>
            <button
              onClick={refreshEvents}
              disabled={isRefreshing}
              className="p-1 hover:bg-accent rounded-md transition-colors disabled:opacity-50"
              title="Refresh events"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
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
                      minute: '2-digit'
                    });
                  }
                  
                  return (
                    <div
                      key={event.id}
                      className={`flex items-start space-x-3 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer ${
                        event.status === 'live' ? 'bg-red-500/5 border border-red-500/20' : ''
                      }`}
                    >
                      <div className="text-2xl">{event.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {event.status === 'live' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white bg-red-500 rounded animate-pulse">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                              Live
                            </span>
                          )}
                          <span className="font-medium text-sm truncate">{event.league || event.sport}</span>
                        </div>
                        {event.teams ? (
                          <div className="text-xs text-foreground mt-0.5">
                            {event.teams.home} vs {event.teams.away}
                          </div>
                        ) : (
                          <div className="text-xs text-foreground mt-0.5 truncate">
                            {event.name}
                          </div>
                        )}
                        {timeDisplay && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {timeDisplay}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {lastUpdated && (
                <div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No upcoming events found</div>
          )}
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-primary via-bright-cobalt to-accent rounded-lg p-4 text-white">
          <div className="flex items-center space-x-2 mb-3">
            <Trophy className="h-5 w-5" />
            <h3 className="font-semibold text-base">Community Stats</h3>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-white/20 rounded animate-pulse"></div>
              <div className="h-4 bg-white/20 rounded animate-pulse"></div>
              <div className="h-4 bg-white/20 rounded animate-pulse"></div>
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
      </div>
    </aside>
  );
};

