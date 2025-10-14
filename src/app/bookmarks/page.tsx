"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Bookmark, Search, Filter, AlertCircle } from "lucide-react";
import { Post, SPORT_CATEGORIES } from "@/types";

// Mock bookmarked posts
const mockBookmarks: Post[] = [
  {
    id: "1",
    title: "The Evolution of Basketball: From Naismith to the Modern NBA",
    content: "Basketball has evolved tremendously since Dr. James Naismith invented the game in 1891...",
    excerpt: "Explore the fascinating journey of basketball from its humble beginnings to becoming one of the world's most popular sports.",
    author: {
      id: "1",
      username: "basketball_historian",
      displayName: "Sarah Johnson",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: true,
      hiveUsername: "basketball_historian",
      createdAt: new Date("2023-01-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "basketball")!,
    tags: ["basketball", "history", "NBA", "evolution"],
    isPublished: true,
    isDraft: false,
    hivePostId: "hive_post_1",
    hiveUrl: "https://hive.blog/@basketball_historian/evolution-basketball",
    upvotes: 247,
    comments: 23,
    readTime: 8,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    publishedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "Soccer Tactics: The Rise of the False 9 Position",
    content: "The false 9 position has revolutionized modern soccer tactics...",
    excerpt: "Learn how the false 9 position has changed the game and why it's become essential for top teams worldwide.",
    author: {
      id: "2",
      username: "soccer_tactician",
      displayName: "Miguel Rodriguez",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      isHiveAuth: true,
      hiveUsername: "soccer_tactician",
      createdAt: new Date("2023-02-01"),
      updatedAt: new Date(),
    },
    featuredImage: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=400&fit=crop",
    sport: SPORT_CATEGORIES.find(s => s.id === "soccer")!,
    tags: ["soccer", "tactics", "false9", "football"],
    isPublished: true,
    isDraft: false,
    hivePostId: "hive_post_2",
    hiveUrl: "https://hive.blog/@soccer_tactician/false9-tactics",
    upvotes: 189,
    comments: 31,
    readTime: 6,
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-14"),
    publishedAt: new Date("2024-01-14"),
  },
];

export default function BookmarksPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to view your bookmarked posts.
          </p>
          <Button onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bookmark className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Bookmarks</h1>
            <span className="text-sm text-muted-foreground">
              ({mockBookmarks.length} saved)
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search bookmarks..."
                className="pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Bookmarks */}
        {mockBookmarks.length > 0 ? (
          <div className="space-y-6">
            {mockBookmarks.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
            <p className="text-muted-foreground mb-4">
              Save posts you want to read later by clicking the bookmark button.
            </p>
            <Button onClick={() => router.push("/")}>
              Explore Posts
            </Button>
          </div>
        )}

        {/* Load More */}
        {mockBookmarks.length > 0 && (
          <div className="text-center">
            <Button variant="outline" size="lg">
              Load More Bookmarks
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
