'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/core/Button';
import { Clock, Filter, Loader2 } from 'lucide-react';
// fetchSportsblockPosts is now accessed via API route
import { SportsblockPost } from '@/lib/shared/types';

export default function NewPostsPage() {
  const [posts, setPosts] = useState<SportsblockPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSport] = useState<string>('');

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '20',
        sort: 'created',
      });
      if (selectedSport) params.append('sportCategory', selectedSport);

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
      console.error('Error loading posts:', err);
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
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">New Posts</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Posts Feed */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading posts...</span>
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
            <Clock className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No new posts</h3>
            <p className="mb-4 text-muted-foreground">
              Check back later for the latest sports content.
            </p>
          </div>
        )}

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
