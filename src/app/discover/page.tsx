'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/core/Button';
import { Compass, TrendingUp, Loader2 } from 'lucide-react';
import { SPORT_CATEGORIES } from '@/types';
// fetchSportsblockPosts is now accessed via API route
import { SportsblockPost } from '@/lib/shared/types';
import { logger } from '@/lib/logger';

export default function DiscoverPage() {
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [posts, setPosts] = useState<SportsblockPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '20',
        sort: 'trending',
      });
      if (selectedSport !== 'all') params.append('sportCategory', selectedSport);

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

      setPosts(result.success ? result.posts : []);
    } catch (err) {
      logger.error('Error loading posts', 'DiscoverPage', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSport]);

  useEffect(() => {
    loadPosts();
  }, [selectedSport, loadPosts]);

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
          {SPORT_CATEGORIES.map((sport) => (
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
          ))}
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
              <p className="mb-4 text-red-500">{error}</p>
              <Button onClick={loadPosts}>Try Again</Button>
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={`${post.author}-${post.permlink}`} post={post} />
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
        {posts.length > 0 && (
          <div className="text-center">
            <Button variant="outline" size="lg" onClick={loadPosts}>
              Load More Posts
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
