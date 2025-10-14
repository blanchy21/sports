"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { Clock, Filter } from "lucide-react";
import { Post, SPORT_CATEGORIES } from "@/types";

// Mock data - in real app this would come from API
const mockNewPosts: Post[] = [
  {
    id: "4",
    title: "Baseball Analytics: The Impact of Launch Angle on Home Runs",
    content: "Modern baseball has embraced analytics like never before...",
    excerpt: "Dive deep into how launch angle analytics have revolutionized baseball strategy and player development.",
    author: {
      id: "4",
      username: "baseball_analyst",
      displayName: "Mike Thompson",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: true,
      hiveUsername: "baseball_analyst",
      createdAt: new Date("2023-04-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "baseball")!,
    tags: ["baseball", "analytics", "launch-angle", "home-runs"],
    isPublished: true,
    isDraft: false,
    hivePostId: "hive_post_4",
    hiveUrl: "https://hive.blog/@baseball_analyst/launch-angle-analytics",
    upvotes: 89,
    comments: 12,
    readTime: 7,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    publishedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "5",
    title: "Hockey Goaltending: The Evolution of Butterfly Style",
    content: "The butterfly style has fundamentally changed how goalies play...",
    excerpt: "Explore how the butterfly style revolutionized hockey goaltending and its impact on the modern game.",
    author: {
      id: "5",
      username: "hockey_goalie",
      displayName: "Alex Petrov",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: false,
      createdAt: new Date("2023-05-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "hockey")!,
    tags: ["hockey", "goaltending", "butterfly", "technique"],
    isPublished: true,
    isDraft: false,
    upvotes: 67,
    comments: 8,
    readTime: 6,
    createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 45),
    publishedAt: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: "6",
    title: "Golf Course Design: How Architecture Affects Strategy",
    content: "Golf course architecture is both art and science...",
    excerpt: "Learn how golf course design influences strategy and why some courses are considered masterpieces.",
    author: {
      id: "6",
      username: "golf_architect",
      displayName: "Robert Green",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: true,
      hiveUsername: "golf_architect",
      createdAt: new Date("2023-06-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "golf")!,
    tags: ["golf", "architecture", "course-design", "strategy"],
    isPublished: true,
    isDraft: false,
    hivePostId: "hive_post_6",
    hiveUrl: "https://hive.blog/@golf_architect/course-design-strategy",
    upvotes: 134,
    comments: 15,
    readTime: 9,
    createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60),
  },
];

export default function NewPostsPage() {
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
        <div className="space-y-6">
          {mockNewPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
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
