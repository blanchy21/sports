"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Bookmark, Search, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { BookmarkItem } from "@/stores/bookmarkStore";

export default function BookmarksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { getUserBookmarks, clearAllBookmarks, isLoading, error } = useBookmarks();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load bookmarks from the store
  const loadBookmarks = useCallback(() => {
    const userBookmarks = getUserBookmarks();
    setBookmarks(userBookmarks);
  }, [getUserBookmarks]);

  // Filter and sort bookmarks
  const filteredAndSortedBookmarks = bookmarks
    .filter(bookmark => {
      const post = bookmark.post;
      const isHivePost = 'isSportsblockPost' in post;
      const title = (post.title as string).toLowerCase();
      const content = isHivePost ? (post.body as string).toLowerCase() : (post.excerpt as string).toLowerCase();
      const tags = (post.tags as string[]) || [];
      
      return title.includes(searchQuery.toLowerCase()) ||
             content.includes(searchQuery.toLowerCase()) ||
             tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime();
        case 'oldest':
          return new Date(a.bookmarkedAt).getTime() - new Date(b.bookmarkedAt).getTime();
        case 'title':
          return (a.post.title as string).localeCompare(b.post.title as string);
        default:
          return 0;
      }
    });

  // Load bookmarks when user changes
  useEffect(() => {
    if (user) {
      loadBookmarks();
    }
  }, [user, loadBookmarks]);

  // Handle clear all bookmarks
  const handleClearAll = async () => {
    await clearAllBookmarks();
    setBookmarks([]);
    setShowClearConfirm(false);
  };

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
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
              className="px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title A-Z</option>
            </select>

            {bookmarks.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
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
        ) : filteredAndSortedBookmarks.length > 0 ? (
          <div className="space-y-6">
            {filteredAndSortedBookmarks.map((bookmark) => (
              <PostCard key={bookmark.id} post={bookmark.post as any} />
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

        {/* Clear All Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-2">Clear All Bookmarks</h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to remove all {bookmarks.length} bookmarks? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleClearAll}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
