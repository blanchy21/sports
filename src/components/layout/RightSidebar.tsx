"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Users, Calendar, Trophy, Star, AlertCircle } from "lucide-react";
import { fetchSportsblockPosts } from "@/lib/hive-workerbee/content";
import { 
  getAnalyticsData, 
  TrendingSport, 
  TrendingTopic, 
  TopAuthor, 
  CommunityStats 
} from "@/lib/hive-workerbee/analytics";

// Keep only the upcoming events as hardcoded
const upcomingEvents = [
  { id: 1, name: "NBA Playoffs", date: "April 15, 2024", icon: "🏀" },
  { id: 2, name: "Champions League Final", date: "May 28, 2024", icon: "⚽" },
  { id: 3, name: "Wimbledon", date: "July 1, 2024", icon: "🎾" },
];

export const RightSidebar: React.FC = () => {
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

  // Fetch posts and calculate analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch recent posts (last 100 posts)
        const result = await fetchSportsblockPosts({
          limit: 100,
          sort: 'created',
        });
        
        // Calculate analytics data
        const analytics = getAnalyticsData(result.posts);
        
        setTrendingSports(analytics.trendingSports);
        setTrendingTopics(analytics.trendingTopics);
        setTopAuthors(analytics.topAuthors);
        setCommunityStats(analytics.communityStats);
        
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load sidebar data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

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
                    <button className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                      Follow
                    </button>
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
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Upcoming Events</h3>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="text-2xl">{event.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{event.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {event.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-primary via-teal-500 to-cyan-500 rounded-lg p-4 text-white">
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

