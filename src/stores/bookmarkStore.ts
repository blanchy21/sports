import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { type AnyPost, getPostId } from '@/lib/utils/post-helpers';

export interface BookmarkItem {
  id: string;
  post: AnyPost;
  bookmarkedAt: Date;
  userId: string;
}

/**
 * Create a lookup key for O(1) bookmark checks
 */
function createBookmarkKey(postId: string, userId: string): string {
  return `${userId}:${postId}`;
}

interface BookmarkState {
  bookmarks: BookmarkItem[];
  /** O(1) lookup index - keys are `userId:postId` */
  bookmarkIndex: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
}

interface BookmarkActions {
  addBookmark: (post: AnyPost, userId: string) => void;
  removeBookmark: (postId: string, userId: string) => void;
  isBookmarked: (postId: string, userId: string) => boolean;
  getBookmarks: (userId: string) => BookmarkItem[];
  clearBookmarks: (userId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBookmarkStore = create<BookmarkState & BookmarkActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        bookmarks: [],
        bookmarkIndex: {},
        isLoading: false,
        error: null,

        // Actions - using immer for safe mutable-style updates
        addBookmark: (post, userId) => {
          const postId = getPostId(post);
          const key = createBookmarkKey(postId, userId);

          // O(1) check if already bookmarked
          if (get().bookmarkIndex[key]) {
            return;
          }

          const newBookmark: BookmarkItem = {
            id: postId,
            post,
            bookmarkedAt: new Date(),
            userId,
          };

          set((state) => {
            state.bookmarks.push(newBookmark);
            state.bookmarkIndex[key] = true;
          });
        },

        removeBookmark: (postId, userId) =>
          set((state) => {
            const key = createBookmarkKey(postId, userId);
            const index = state.bookmarks.findIndex(
              (bookmark) => bookmark.id === postId && bookmark.userId === userId
            );
            if (index !== -1) {
              state.bookmarks.splice(index, 1);
              delete state.bookmarkIndex[key];
            }
          }),

        // O(1) lookup using index
        isBookmarked: (postId, userId) => {
          const key = createBookmarkKey(postId, userId);
          return !!get().bookmarkIndex[key];
        },

        getBookmarks: (userId) => {
          return get()
            .bookmarks.filter((bookmark) => bookmark.userId === userId)
            .sort(
              (a, b) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime()
            );
        },

        clearBookmarks: (userId) =>
          set((state) => {
            // Remove from index first
            state.bookmarks.forEach((bookmark) => {
              if (bookmark.userId === userId) {
                const key = createBookmarkKey(bookmark.id, userId);
                delete state.bookmarkIndex[key];
              }
            });
            // Then remove from array
            state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.userId !== userId);
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),
      })),
      {
        name: 'sportsblock-bookmarks',
        version: 2,
        // Migration function to handle version changes
        migrate: (persistedState: unknown, version: number) => {
          const state = persistedState as BookmarkState;
          if (version < 2) {
            // v1 -> v2: Add bookmarkIndex if missing
            const newIndex: Record<string, boolean> = {};
            if (state.bookmarks) {
              state.bookmarks.forEach((bookmark) => {
                const key = createBookmarkKey(bookmark.id, bookmark.userId);
                newIndex[key] = true;
              });
            }
            return {
              ...state,
              bookmarks: state.bookmarks || [],
              bookmarkIndex: newIndex,
              isLoading: false,
              error: null,
            };
          }
          return state;
        },
        // Rebuild index on rehydration from localStorage
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Rebuild the index from bookmarks array
            const newIndex: Record<string, boolean> = {};
            state.bookmarks.forEach((bookmark) => {
              const key = createBookmarkKey(bookmark.id, bookmark.userId);
              newIndex[key] = true;
            });
            state.bookmarkIndex = newIndex;
          }
        },
      }
    ),
    { name: 'BookmarkStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// Granular selectors
export const useBookmarks = () => useBookmarkStore((s) => s.bookmarks);
export const useBookmarkLoading = () => useBookmarkStore((s) => s.isLoading);
