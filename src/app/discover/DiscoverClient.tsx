'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/core/Button';
import { Compass, TrendingUp, Loader2 } from 'lucide-react';
import { SPORT_CATEGORIES } from '@/types';
import { SportsblockPost } from '@/lib/shared/types';
import { logger } from '@/lib/logger';

const VISIBLE_SPORT_COUNT = 8;

interface DiscoverClientProps {
  initialPosts?: SportsblockPost[];
}

export default function DiscoverClient({ initialPosts }: DiscoverClientProps) {
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [showAllSports, setShowAllSports] = useState(false);
  const [posts, setPosts] = useState<SportsblockPost[]>(initialPosts ?? []);
  const [isLoading, setIsLoading] = useState(!initialPosts?.length);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const nextCursorRef = useRef<string | undefined>(undefined);

  const loadPosts = useCallback(
    async (cursor?: string) => {
      const isAppending = !!cursor;
      if (isAppending) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: '20',
          sort: 'trending',
        });
        if (selectedSport !== 'all') params.append('sportCategory', selectedSport);
        if (cursor) params.append('before', cursor);

        const response = await fetch(`/api/hive/posts?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch posts: ${response.status}`);
        }
        const result = (await response.json()) as {
          success: boolean;
          posts: SportsblockPost[];
          hasMore: boolean;
          nextCursor?: string;
        };

        if (result.success) {
          setPosts((prev) => (isAppending ? [...prev, ...result.posts] : result.posts));
          setHasMore(result.hasMore);
          nextCursorRef.current = result.nextCursor;
        } else {
          setPosts((prev) => (isAppending ? prev : []));
          setHasMore(false);
        }
      } catch (err) {
        logger.error('Error loading posts', 'DiscoverPage', err);
        setError('Failed to load posts. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedSport]
  );

  // Reset and fetch when sport filter changes
  useEffect(() => {
    if (selectedSport === 'all' && initialPosts?.length) return;
    nextCursorRef.current = undefined;
    setHasMore(true);
    loadPosts();
  }, [selectedSport, loadPosts, initialPosts]);

  const handleLoadMore = () => {
    if (nextCursorRef.current && !isLoadingMore) {
      loadPosts(nextCursorRef.current);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Compass className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Discover Sports</h1>
          </div>
        </div>

        {/* Sport Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSport === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSport('all')}
          >
            All Sports
          </Button>
          {(showAllSports ? SPORT_CATEGORIES : SPORT_CATEGORIES.slice(0, VISIBLE_SPORT_COUNT)).map(
            (sport) => (
              <Button
                key={sport.id}
                variant={selectedSport === sport.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSport(sport.id)}
                className="flex items-center space-x-2"
              >
                <span>{sport.icon}</span>
                <span>{sport.name}</span>
              </Button>
            )
          )}
          {SPORT_CATEGORIES.length > VISIBLE_SPORT_COUNT && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllSports(!showAllSports)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showAllSports
                ? 'Show less'
                : `+${SPORT_CATEGORIES.length - VISIBLE_SPORT_COUNT} more`}
            </Button>
          )}
        </div>

        {/* Trending Posts */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Trending Posts</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading trending posts...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-destructive">{error}</p>
              <Button onClick={() => loadPosts()}>Try Again</Button>
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post, index) => (
                <PostCard
                  key={`${post.author}-${post.permlink}`}
                  post={post}
                  priority={index < 2}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <TrendingUp className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No trending posts</h3>
              <p className="mb-4 text-muted-foreground">
                Check back later for trending sports content.
              </p>
            </div>
          )}
        </div>

        {/* Load More */}
        {posts.length > 0 && hasMore && (
          <div className="text-center">
            <Button variant="outline" size="lg" onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Posts'
              )}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
