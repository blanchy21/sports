'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ComposeSportsbite, SportsbitesFeed } from '@/components/sportsbites';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast, toast } from '@/components/core/Toast';
import type { Sportsbite } from '@/lib/hive-workerbee/sportsbites';
import Image from 'next/image';
import { Zap, TrendingUp, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { Button } from '@/components/core/Button';
import { useFollowing } from '@/lib/react-query/queries/useFollowers';

type FeedFilter = 'latest' | 'trending' | 'following';

export default function SportsBitesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [activeFilter, setActiveFilter] = useState<FeedFilter>('latest');
  const [optimisticBite, setOptimisticBite] = useState<Sportsbite | null>(null);
  const [followingList, setFollowingList] = useState<string[]>([]);

  const { data: followingData } = useFollowing(user?.username || '', { enabled: !!user?.username });

  useEffect(() => {
    if (followingData?.pages) {
      const usernames = followingData.pages
        .flatMap((page) => page.relationships || [])
        .map((rel) => rel.following);
      setFollowingList(usernames);
    }
  }, [followingData]);

  const handlePostSuccess = useCallback(
    (bite: Sportsbite) => {
      addToast(toast.success('Posted!', 'Your sportsbite is live.'));
      setOptimisticBite(bite);
    },
    [addToast]
  );

  const handlePostError = useCallback(
    (error: string) => {
      addToast(toast.error('Post Failed', error));
    },
    [addToast]
  );

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

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
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur-xl">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/sportsbites-logo.png"
                alt="Sportsbites"
                width={44}
                height={44}
                className="rounded-xl shadow-lg"
              />
              <div>
                <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-2xl font-bold">
                  Sportsbites
                </h1>
                <p className="text-sm text-muted-foreground">Quick takes & live reactions</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Live</span>
            </div>
          </div>

          <div className="flex gap-1.5 pb-3">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <Button
                  key={filter.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    'flex-1 gap-2 transition-all duration-300',
                    isActive
                      ? 'scale-[1.02] bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'hover:scale-[1.01] hover:bg-muted/80'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive && 'animate-pulse')} />
                  {filter.label}
                  {filter.id === 'following' && followingList.length > 0 && (
                    <span
                      className={cn(
                        'ml-1 rounded-full px-1.5 py-0.5 text-xs',
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
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
          <ComposeSportsbite onSuccess={handlePostSuccess} onError={handlePostError} />
        </div>

        {/* Info banner */}
        <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/20 p-2">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">What are Sportsbites?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Quick 280-character posts perfect for live match reactions, hot takes, and instant
                sports commentary. All posts are stored on the Hive blockchain and can earn rewards!
              </p>
            </div>
          </div>
        </div>

        {/* Feed */}
        <SportsbitesFeed
          optimisticBite={optimisticBite}
          filterMode={activeFilter}
          followingList={followingList}
        />

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 text-center">
            <div className="mb-3 text-3xl">&#9889;</div>
            <h3 className="mb-1 font-semibold">Quick Takes</h3>
            <p className="text-sm text-muted-foreground">280 characters for instant reactions</p>
          </div>

          <div className="rounded-xl border bg-card p-5 text-center">
            <div className="mb-3 text-3xl">&#127942;</div>
            <h3 className="mb-1 font-semibold">Earn Rewards</h3>
            <p className="text-sm text-muted-foreground">Get upvoted and earn HIVE/HBD</p>
          </div>

          <div className="rounded-xl border bg-card p-5 text-center">
            <div className="mb-3 text-3xl">&#128279;</div>
            <h3 className="mb-1 font-semibold">Decentralized</h3>
            <p className="text-sm text-muted-foreground">Stored forever on Hive blockchain</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
