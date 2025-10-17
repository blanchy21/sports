"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { Compass, TrendingUp, Loader2 } from "lucide-react";
import { SPORT_CATEGORIES } from "@/types";
import { fetchSportsblockPosts, SportsblockPost } from "@/lib/hive-workerbee/content";

export default function DiscoverPage() {
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [posts, setPosts] = useState<SportsblockPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchSportsblockPosts({
        sportCategory: selectedSport === "all" ? undefined : selectedSport,
        limit: 20,
        sort: 'trending', // Use trending sort for discover page
      });
      
      setPosts(result.posts);
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
            <Compass className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Discover Sports</h1>
          </div>
        </div>

        {/* Sport Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSport === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSport("all")}
          >
            All Sports
          </Button>
          {SPORT_CATEGORIES.map((sport) => (
            <Button
              key={sport.id}
              variant={selectedSport === sport.id ? "default" : "outline"}
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
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={loadPosts}>Try Again</Button>
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={`${post.author}-${post.permlink}`} post={post as any} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No trending posts</h3>
              <p className="text-muted-foreground mb-4">
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
