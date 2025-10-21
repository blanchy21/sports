import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Post } from '@/types';
import { SportsblockPost } from '@/lib/shared/types';

export interface BookmarkItem {
  id: string;
  post: Post | SportsblockPost | any; // Allow flexible post types
  bookmarkedAt: Date;
  userId: string;
}

interface BookmarkState {
  bookmarks: BookmarkItem[];
  isLoading: boolean;
  error: string | null;
}

interface BookmarkActions {
  addBookmark: (post: Post | SportsblockPost | any, userId: string) => void;
  removeBookmark: (postId: string, userId: string) => void;
  isBookmarked: (postId: string, userId: string) => boolean;
  getBookmarks: (userId: string) => BookmarkItem[];
  clearBookmarks: (userId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBookmarkStore = create<BookmarkState & BookmarkActions>()(
  persist(
    (set, get) => ({
      // State
      bookmarks: [],
      isLoading: false,
      error: null,

      // Actions
      addBookmark: (post, userId) => {
        const { bookmarks } = get();
        const postId = 'isSportsblockPost' in post ? `${post.author}/${post.permlink}` : post.id;
        
        // Check if already bookmarked
        const existingBookmark = bookmarks.find(
          bookmark => bookmark.id === postId && bookmark.userId === userId
        );
        
        if (!existingBookmark) {
          const newBookmark: BookmarkItem = {
            id: postId,
            post,
            bookmarkedAt: new Date(),
            userId,
          };
          
          set({ bookmarks: [...bookmarks, newBookmark] });
        }
      },

      removeBookmark: (postId, userId) => {
        const { bookmarks } = get();
        const filteredBookmarks = bookmarks.filter(
          bookmark => !(bookmark.id === postId && bookmark.userId === userId)
        );
        set({ bookmarks: filteredBookmarks });
      },

      isBookmarked: (postId, userId) => {
        const { bookmarks } = get();
        return bookmarks.some(
          bookmark => bookmark.id === postId && bookmark.userId === userId
        );
      },

      getBookmarks: (userId) => {
        const { bookmarks } = get();
        return bookmarks
          .filter(bookmark => bookmark.userId === userId)
          .sort((a, b) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime());
      },

      clearBookmarks: (userId) => {
        const { bookmarks } = get();
        const filteredBookmarks = bookmarks.filter(bookmark => bookmark.userId !== userId);
        set({ bookmarks: filteredBookmarks });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),
    }),
    {
      name: 'sportsblock-bookmarks',
      version: 1,
    }
  )
);
