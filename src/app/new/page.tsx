"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { Clock, Filter, Loader2 } from "lucide-react";
import { fetchSportsblockPosts } from "@/lib/hive-workerbee/content";
import { SportsblockPost } from "@/lib/shared/types";

export default function NewPostsPage() {
  const [posts, setPosts] = useState<SportsblockPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSport] = useState<string>("");

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchSportsblockPosts({
        sportCategory: selectedSport || undefined,
        limit: 20,
        sort: 'created',
      });
      
      setPosts(result.posts as unknown as SportsblockPost[]);
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">New Posts</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
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
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadPosts}>Try Again</Button>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={`${post.author}-${post.permlink}`} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No new posts</h3>
            <p className="text-muted-foreground mb-4">
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
