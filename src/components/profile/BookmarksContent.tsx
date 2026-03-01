'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Bookmark, Search, Loader2, Trash2 } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { BookmarkItem } from '@/stores/bookmarkStore';
import { getPostTitle, getPostBody, getPostTags } from '@/lib/utils/post-helpers';

export function BookmarksContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { getUserBookmarks, clearAllBookmarks, isLoading, error } = useBookmarks();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadBookmarks = useCallback(() => {
    const userBookmarks = getUserBookmarks();
    setBookmarks(userBookmarks);
  }, [getUserBookmarks]);

  const filteredAndSortedBookmarks = bookmarks
    .filter((bookmark) => {
      const title = getPostTitle(bookmark.post).toLowerCase();
      const content = getPostBody(bookmark.post).toLowerCase();
      const tags = getPostTags(bookmark.post);
      const query = searchQuery.toLowerCase();

      return (
        title.includes(query) ||
        content.includes(query) ||
        tags.some((tag) => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime();
        case 'oldest':
          return new Date(a.bookmarkedAt).getTime() - new Date(b.bookmarkedAt).getTime();
        case 'title':
          return getPostTitle(a.post).localeCompare(getPostTitle(b.post));
        default:
          return 0;
      }
    });

  useEffect(() => {
    if (user) {
      loadBookmarks();
    }
  }, [user, loadBookmarks]);

  const handleClearAll = async () => {
    await clearAllBookmarks();
    setBookmarks([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bookmark className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Bookmarks</h2>
          <span className="text-sm text-muted-foreground">({bookmarks.length} saved)</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border bg-background py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
            className="rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="text-destructive hover:bg-destructive/10 hover:text-destructive/80"
            >
              <Trash2 className="mr-2 h-4 w-4" />
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
        <div className="py-12 text-center">
          <p className="mb-4 text-destructive">{error}</p>
          <Button onClick={loadBookmarks}>Try Again</Button>
        </div>
      ) : filteredAndSortedBookmarks.length > 0 ? (
        <div className="space-y-6">
          {filteredAndSortedBookmarks.map((bookmark) => (
            <PostCard key={bookmark.id} post={bookmark.post} />
          ))}
        </div>
      ) : searchQuery ? (
        <div className="py-12 text-center">
          <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No bookmarks found</h3>
          <p className="mb-4 text-muted-foreground">
            No bookmarks match your search query &quot;{searchQuery}&quot;.
          </p>
          <Button onClick={() => setSearchQuery('')}>Clear Search</Button>
        </div>
      ) : (
        <div className="py-12 text-center">
          <Bookmark className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No bookmarks yet</h3>
          <p className="mb-4 text-muted-foreground">
            Save posts you want to read later by clicking the bookmark button.
          </p>
          <Button onClick={() => router.push('/')}>Explore Posts</Button>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 max-w-md rounded-lg bg-card p-6">
            <h3 className="mb-2 text-lg font-semibold">Clear All Bookmarks</h3>
            <p className="mb-4 text-muted-foreground">
              Are you sure you want to remove all {bookmarks.length} bookmarks? This action cannot
              be undone.
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
                className="flex-1 bg-destructive text-white hover:bg-destructive/90"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
