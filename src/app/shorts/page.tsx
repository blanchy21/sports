"use client";

import React, { useState, useCallback, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ComposeShort, ShortsFeed } from "@/components/shorts";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useToast, toast } from "@/components/ui/Toast";
import { Zap, TrendingUp, Clock, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useFollowing } from "@/lib/react-query/queries/useFollowers";

type FeedFilter = 'latest' | 'trending' | 'following';

export default function ShortsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('latest');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [followingList, setFollowingList] = useState<string[]>([]);

  // Fetch following list for "Following" filter
  const { data: followingData } = useFollowing(
    user?.username || '',
    { enabled: !!user?.username }
  );

  // Extract following usernames from the data
  useEffect(() => {
    if (followingData?.pages) {
      const usernames = followingData.pages
        .flatMap(page => page.relationships || [])
        .map(rel => rel.following);
      setFollowingList(usernames);
    }
  }, [followingData]);

  // Handle successful post
  const handlePostSuccess = useCallback(() => {
    addToast(toast.success("Posted!", "Your short has been published to Hive."));
    // Trigger a refresh of the feed
    setRefreshTrigger(prev => prev + 1);
  }, [addToast]);

  // Handle post error
  const handlePostError = useCallback((error: string) => {
    addToast(toast.error("Post Failed", error));
  }, [addToast]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  // Show skeleton while auth is loading (handled by loading.tsx for initial load)
  // This handles subsequent navigations where auth state may still be loading
  if (isAuthLoading) {
    return null; // Let loading.tsx handle it
  }

  // User not authenticated - will redirect
  if (!user) {
    return null;
  }

  const filters: { id: FeedFilter; label: string; icon: React.ElementType }[] = [
    { id: 'latest', label: 'Latest', icon: Clock },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'following', label: 'Following', icon: Users },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 mb-4 -mx-4 px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 bg-gradient-to-br from-primary via-primary to-accent rounded-xl shadow-lg shadow-primary/20">
                <Zap className="h-6 w-6 text-white" />
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Shorts
                </h1>
                <p className="text-sm text-muted-foreground">
                  Quick takes & live reactions
                </p>
              </div>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Live</span>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 pb-3">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <Button
                  key={filter.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    "flex-1 gap-2 transition-all duration-300",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]" 
                      : "hover:bg-muted/80 hover:scale-[1.01]"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive && "animate-pulse")} />
                  {filter.label}
                  {filter.id === 'following' && followingList.length > 0 && (
                    <span className={cn(
                      "ml-1 px-1.5 py-0.5 text-xs rounded-full",
                      isActive 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {followingList.length}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Compose box */}
        <div className="mb-6">
          <ComposeShort
            onSuccess={handlePostSuccess}
            onError={handlePostError}
          />
        </div>

        {/* Info banner for new users */}
        <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">What are Shorts?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Quick 280-character posts perfect for live match reactions, hot takes, 
                and instant sports commentary. All posts are stored on the Hive blockchain 
                and can earn rewards!
              </p>
            </div>
          </div>
        </div>

        {/* Feed */}
        <ShortsFeed 
          refreshTrigger={refreshTrigger}
          filterMode={activeFilter}
          followingList={followingList}
        />

        {/* Feature highlights (shown when feed is empty) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-xl p-5 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold mb-1">Quick Takes</h3>
            <p className="text-sm text-muted-foreground">
              280 characters for instant reactions
            </p>
          </div>

          <div className="bg-card border rounded-xl p-5 text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-semibold mb-1">Earn Rewards</h3>
            <p className="text-sm text-muted-foreground">
              Get upvoted and earn HIVE/HBD
            </p>
          </div>

          <div className="bg-card border rounded-xl p-5 text-center">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="font-semibold mb-1">Decentralized</h3>
            <p className="text-sm text-muted-foreground">
              Stored forever on Hive blockchain
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
