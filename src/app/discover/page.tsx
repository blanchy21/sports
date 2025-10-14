"use client";

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { Compass, TrendingUp } from "lucide-react";
import { Post, SPORT_CATEGORIES } from "@/types";

// Mock trending posts
const mockTrendingPosts: Post[] = [
  {
    id: "7",
    title: "MMA Training: The Science Behind Fight Preparation",
    content: "Modern MMA training combines multiple disciplines...",
    excerpt: "Discover the scientific approach to MMA training and how fighters prepare for the ultimate test of combat sports.",
    author: {
      id: "7",
      username: "mma_coach",
      displayName: "Carlos Mendoza",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: true,
      hiveUsername: "mma_coach",
      createdAt: new Date("2023-07-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "mma")!,
    tags: ["mma", "training", "science", "preparation"],
    isPublished: true,
    isDraft: false,
    hivePostId: "hive_post_7",
    hiveUrl: "https://hive.blog/@mma_coach/training-science",
    upvotes: 423,
    comments: 67,
    readTime: 8,
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-12"),
    publishedAt: new Date("2024-01-12"),
  },
  {
    id: "8",
    title: "Formula 1: The Engineering Marvel of Modern Racing",
    content: "Formula 1 cars are engineering masterpieces...",
    excerpt: "Explore the incredible engineering behind Formula 1 cars and how technology drives the fastest sport on Earth.",
    author: {
      id: "8",
      username: "f1_engineer",
      displayName: "James Wilson",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: true,
      hiveUsername: "f1_engineer",
      createdAt: new Date("2023-08-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "motorsports")!,
    tags: ["f1", "engineering", "racing", "technology"],
    isPublished: true,
    isDraft: false,
    hivePostId: "hive_post_8",
    hiveUrl: "https://hive.blog/@f1_engineer/engineering-marvel",
    upvotes: 567,
    comments: 89,
    readTime: 10,
    createdAt: new Date("2024-01-11"),
    updatedAt: new Date("2024-01-11"),
    publishedAt: new Date("2024-01-11"),
  },
];

export default function DiscoverPage() {
  const [selectedSport, setSelectedSport] = useState<string>("all");

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
          
          <div className="space-y-6">
            {mockTrendingPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline" size="lg">
            Load More Posts
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
