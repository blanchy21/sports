import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Post } from '@/types';
import { SportsblockPost } from '@/lib/shared/types';

export interface BookmarkItem {
  id: string;
  post: Post | SportsblockPost | Record<string, unknown>; // Allow flexible post types
  bookmarkedAt: Date;
  userId: string;
}

interface BookmarkState {
  bookmarks: BookmarkItem[];
  isLoading: boolean;
  error: string | null;
}

interface BookmarkActions {
  addBookmark: (post: Post | SportsblockPost | Record<string, unknown>, userId: string) => void;
  removeBookmark: (postId: string, userId: string) => void;
  isBookmarked: (postId: string, userId: string) => boolean;
  getBookmarks: (userId: string) => BookmarkItem[];
  clearBookmarks: (userId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBookmarkStore = create<BookmarkState & BookmarkActions>()(
  persist(
    immer((set, get) => ({
      // State
      bookmarks: [],
      isLoading: false,
      error: null,

      // Actions - using immer for safe mutable-style updates
      addBookmark: (post, userId) => {
        const postId = 'isSportsblockPost' in post ? `${post.author}/${post.permlink}` : (post as Post).id;

        // Check if already bookmarked using get() since we need to read-then-write
        const existingBookmark = get().bookmarks.find(
          bookmark => bookmark.id === postId && bookmark.userId === userId
        );

        if (!existingBookmark) {
          const newBookmark: BookmarkItem = {
            id: postId,
            post,
            bookmarkedAt: new Date(),
            userId,
          };

          set((state) => {
            state.bookmarks.push(newBookmark);
          });
        }
      },

      removeBookmark: (postId, userId) => set((state) => {
        const index = state.bookmarks.findIndex(
          bookmark => bookmark.id === postId && bookmark.userId === userId
        );
        if (index !== -1) {
          state.bookmarks.splice(index, 1);
        }
      }),

      isBookmarked: (postId, userId) => {
        return get().bookmarks.some(
          bookmark => bookmark.id === postId && bookmark.userId === userId
        );
      },

      getBookmarks: (userId) => {
        return get().bookmarks
          .filter(bookmark => bookmark.userId === userId)
          .sort((a, b) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime());
      },

      clearBookmarks: (userId) => set((state) => {
        state.bookmarks = state.bookmarks.filter(bookmark => bookmark.userId !== userId);
      }),

      setLoading: (loading) => set((state) => {
        state.isLoading = loading;
      }),

      setError: (error) => set((state) => {
        state.error = error;
      }),
    })),
    {
      name: 'sportsblock-bookmarks',
      version: 1,
    }
  )
);
