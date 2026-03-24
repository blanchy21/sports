'use client';

import React, { Suspense, useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ComposeSportsbite, SportsbitesFeed } from '@/components/sportsbites';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast, toast } from '@/components/core/Toast';
import type { Sportsbite } from '@/lib/hive-workerbee/shared';
import { Zap, TrendingUp, Clock, Users, X, Hash } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { Button } from '@/components/core/Button';
import { useFollowing } from '@/lib/react-query/queries/useFollowers';
import { useInvalidateSportsbites } from '@/lib/react-query/queries/useSportsbites';

type FeedFilter = 'latest' | 'trending' | 'following';

function SportsBitesContent() {
  const { user, isLoading: isAuthLoading, authType } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const { invalidateAll: invalidateSportsbites } = useInvalidateSportsbites();
  const tagFilter = searchParams.get('tag') || undefined;

  const [activeFilter, setActiveFilter] = useState<FeedFilter>('latest');
  const [optimisticBite, setOptimisticBite] = useState<Sportsbite | null>(null);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [infoBannerDismissed, setInfoBannerDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sportsbites-info-dismissed') === 'true';
    }
    return false;
  });

  const {
    data: followingData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFollowing(user?.username || '', { enabled: !!user?.username });

  // Auto-load all following pages so the filter has the complete list
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (followingData?.pages) {
      const usernames = followingData.pages
        .flatMap((page) => page.relationships || [])
        .map((rel) => rel.following);
      setFollowingList(usernames);
    }
  }, [followingData]);

  const handlePostSuccess = useCallback(
    (bite: Sportsbite | null) => {
      addToast(toast.success('Posted!', 'Your sportsbite is live.'));
      setOptimisticBite(bite);
      // Invalidate cache so next refetch picks up the new bite from the server
      invalidateSportsbites();
    },
    [addToast, invalidateSportsbites]
  );

  const handlePostError = useCallback(
    (error: string) => {
      addToast(toast.error('Post Failed', error));
    },
    [addToast]
  );

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      // Give a brief grace period — auth state may still be propagating
      // (e.g. after login dispatch + navigation, or HMR in dev mode)
      const timer = setTimeout(() => {
        router.push('/');
      }, 150);
      return () => clearTimeout(timer);
    }
    // Redirect custodial users who haven't completed onboarding
    if (!isAuthLoading && user && authType === 'soft' && !user.onboardingCompleted) {
      router.replace('/onboarding/guide');
    }
  }, [user, isAuthLoading, authType, router]);

  if (isAuthLoading) return null;
  if (!user) return null;

  const filters: { id: FeedFilter; label: string; icon: React.ElementType }[] = [
    { id: 'latest', label: 'Latest', icon: Clock },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'following', label: 'Following', icon: Users },
  ];

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-sb-border bg-background/95 px-4 backdrop-blur-xl">
          <div className="flex items-center justify-between py-3">
            <img
              src="/logo/sportsbites/sportsbites-horizontal.svg"
              alt="Sportsbites"
              className="h-8"
            />

            <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success"></span>
              </span>
              <span className="text-[11px] font-medium text-success">Live</span>
            </div>
          </div>

          <div className="flex">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary font-semibold text-sb-text-primary'
                      : 'border-transparent text-muted-foreground hover:bg-sb-turf/50 hover:text-sb-text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                  {filter.id === 'following' && followingList.length > 0 && (
                    <span className="ml-1 rounded-full bg-sb-turf px-1.5 py-0.5 text-xs text-muted-foreground">
                      {followingList.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tag filter banner */}
        {tagFilter && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Showing bites tagged <span className="text-primary">#{tagFilter}</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/sportsbites')}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-sb-text-primary"
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>
        )}

        {/* Compose box */}
        <div className="mb-4">
          <ComposeSportsbite onSuccess={handlePostSuccess} onError={handlePostError} />
        </div>

        {/* Info banner */}
        {!infoBannerDismissed && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/20 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-primary">What are Sportsbites?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quick 280-character posts perfect for live match reactions, hot takes, and instant
                  sports commentary. All posts are stored on the Hive blockchain and can earn
                  rewards!
                </p>
              </div>
              <button
                onClick={() => {
                  setInfoBannerDismissed(true);
                  localStorage.setItem('sportsbites-info-dismissed', 'true');
                }}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sb-turf hover:text-sb-text-primary"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        <SportsbitesFeed
          optimisticBite={optimisticBite}
          filterMode={activeFilter}
          followingList={followingList}
          tagFilter={tagFilter}
        />

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-sb-stadium p-5 text-center">
            <div className="mb-3 text-3xl">&#9889;</div>
            <h3 className="mb-1 font-semibold">Quick Takes</h3>
            <p className="text-sm text-muted-foreground">280 characters for instant reactions</p>
          </div>

          <div className="rounded-xl border bg-sb-stadium p-5 text-center">
            <div className="mb-3 text-3xl">&#127942;</div>
            <h3 className="mb-1 font-semibold">Earn Rewards</h3>
            <p className="text-sm text-muted-foreground">Get upvoted and earn HIVE/HBD</p>
          </div>

          <div className="rounded-xl border bg-sb-stadium p-5 text-center">
            <div className="mb-3 text-3xl">&#128279;</div>
            <h3 className="mb-1 font-semibold">Decentralized</h3>
            <p className="text-sm text-muted-foreground">Stored forever on Hive blockchain</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function SportsBitesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
          <div className="h-24 animate-pulse rounded-lg bg-sb-stadium" />
          <div className="h-24 animate-pulse rounded-lg bg-sb-stadium" />
          <div className="h-24 animate-pulse rounded-lg bg-sb-stadium" />
        </div>
      }
    >
      <SportsBitesContent />
    </Suspense>
  );
}
