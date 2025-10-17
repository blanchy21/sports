"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Bookmark, Search, Filter, AlertCircle, Loader2 } from "lucide-react";
import { Post } from "@/types";

export default function BookmarksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load bookmarks from localStorage (in a real app, this would be from a database)
  const loadBookmarks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be an API call
      const savedBookmarks = localStorage.getItem('bookmarks');
      if (savedBookmarks) {
        const parsedBookmarks = JSON.parse(savedBookmarks);
        setBookmarks(parsedBookmarks);
      } else {
        setBookmarks([]);
      }
    } catch (err) {
      console.error('Error loading bookmarks:', err);
      setError('Failed to load bookmarks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter bookmarks based on search query
  const filteredBookmarks = bookmarks.filter(bookmark =>
    bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bookmark.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bookmark.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/");
    } else {
      loadBookmarks();
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
              ({bookmarks.length} saved)
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading bookmarks...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadBookmarks}>Try Again</Button>
          </div>
        ) : filteredBookmarks.length > 0 ? (
          <div className="space-y-6">
            {filteredBookmarks.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookmarks found</h3>
            <p className="text-muted-foreground mb-4">
              No bookmarks match your search query &quot;{searchQuery}&quot;.
            </p>
            <Button onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
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
        {filteredBookmarks.length > 0 && (
          <div className="text-center">
            <Button variant="outline" size="lg" onClick={loadBookmarks}>
              Refresh Bookmarks
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
