'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PostCard } from '@/components/posts/PostCard';
import { Post } from '@/types';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Bookmark, Search, Loader2, Trash2 } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { BookmarkItem } from '@/stores/bookmarkStore';

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
      const post = bookmark.post;
      const isHivePost = 'isSportsblockPost' in post;
      const title = (post.title as string).toLowerCase();
      const content = isHivePost
        ? (post.body as string).toLowerCase()
        : (post.excerpt as string).toLowerCase();
      const tags = (post.tags as string[]) || [];

      return (
        title.includes(searchQuery.toLowerCase()) ||
        content.includes(searchQuery.toLowerCase()) ||
        tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
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
          <Bookmark className="text-primary h-6 w-6" />
          <h2 className="text-2xl font-bold">Bookmarks</h2>
          <span className="text-muted-foreground text-sm">({bookmarks.length} saved)</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background focus:ring-primary rounded-lg border py-2 pr-4 pl-10 focus:ring-2 focus:outline-hidden"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
            className="bg-background focus:ring-primary rounded-lg border px-3 py-2 focus:ring-2 focus:outline-hidden"
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
              className="text-red-500 hover:bg-red-50 hover:text-red-700"
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
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <span className="text-muted-foreground ml-2">Loading bookmarks...</span>
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <Button onClick={loadBookmarks}>Try Again</Button>
        </div>
      ) : filteredAndSortedBookmarks.length > 0 ? (
        <div className="space-y-6">
          {filteredAndSortedBookmarks.map((bookmark) => (
            <PostCard key={bookmark.id} post={bookmark.post as Post} />
          ))}
        </div>
      ) : searchQuery ? (
        <div className="py-12 text-center">
          <Search className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
          <h3 className="mb-2 text-lg font-semibold">No bookmarks found</h3>
          <p className="text-muted-foreground mb-4">
            No bookmarks match your search query &quot;{searchQuery}&quot;.
          </p>
          <Button onClick={() => setSearchQuery('')}>Clear Search</Button>
        </div>
      ) : (
        <div className="py-12 text-center">
          <Bookmark className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
          <h3 className="mb-2 text-lg font-semibold">No bookmarks yet</h3>
          <p className="text-muted-foreground mb-4">
            Save posts you want to read later by clicking the bookmark button.
          </p>
          <Button onClick={() => router.push('/')}>Explore Posts</Button>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card mx-4 max-w-md rounded-lg p-6">
            <h3 className="mb-2 text-lg font-semibold">Clear All Bookmarks</h3>
            <p className="text-muted-foreground mb-4">
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
                className="flex-1 bg-red-500 text-white hover:bg-red-600"
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
