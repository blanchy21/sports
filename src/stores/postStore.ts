import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Post } from '@/types';
import { SportsblockPost } from '@/lib/hive-workerbee/content';

// Type guards for Post union
export function isSportsblockPost(post: Post | SportsblockPost): post is SportsblockPost {
  return post.postType === 'sportsblock';
}

export function isStandardPost(post: Post | SportsblockPost): post is Post {
  return post.postType === 'standard';
}

// Helper to get post ID from either type
export function getPostId(post: Post | SportsblockPost): string {
  return isSportsblockPost(post) ? `${post.author}/${post.permlink}` : post.id;
}

interface PostState {
  posts: (Post | SportsblockPost)[];
  selectedPost: (Post | SportsblockPost) | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    sportCategory?: string;
    author?: string;
    tag?: string;
    sort?: 'trending' | 'created' | 'payout' | 'votes';
  };
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
  };
}

interface PostActions {
  setPosts: (posts: (Post | SportsblockPost)[]) => void;
  addPosts: (posts: (Post | SportsblockPost)[]) => void;
  setSelectedPost: (post: (Post | SportsblockPost) | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<PostState['filters']>) => void;
  setPagination: (pagination: Partial<PostState['pagination']>) => void;
  updatePost: (postId: string, updates: Partial<Post | SportsblockPost>) => void;
  clearPosts: () => void;
}

export const usePostStore = create<PostState & PostActions>()(
  devtools(
    immer((set, _get) => ({
      // State
      posts: [],
      selectedPost: null,
      isLoading: false,
      error: null,
      filters: {
        sort: 'created',
      },
      pagination: {
        hasMore: false,
      },

      // Actions - using immer for safe mutable-style updates
      setPosts: (posts) =>
        set((state) => {
          state.posts = posts;
        }),

      addPosts: (newPosts) =>
        set((state) => {
          const existingIds = new Set(state.posts.map(getPostId));
          const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(getPostId(p)));
          state.posts.push(...uniqueNewPosts);
        }),

      setSelectedPost: (post) =>
        set((state) => {
          state.selectedPost = post;
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      setFilters: (newFilters) =>
        set((state) => {
          Object.assign(state.filters, newFilters);
          state.posts = []; // Clear posts when filters change
        }),

      setPagination: (pagination) =>
        set((state) => {
          Object.assign(state.pagination, pagination);
        }),

      updatePost: (postId, updates) =>
        set((state) => {
          const index = state.posts.findIndex((p) => getPostId(p) === postId);
          if (index !== -1) {
            // Immer handles immutability - just merge the updates
            Object.assign(state.posts[index], updates);
          }
        }),

      clearPosts: () =>
        set((state) => {
          state.posts = [];
          state.pagination.hasMore = false;
        }),
    })),
    { name: 'PostStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// Granular selectors — avoids full-store re-renders
export const usePosts = () => usePostStore((s) => s.posts);
export const useSelectedPost = () => usePostStore((s) => s.selectedPost);
export const usePostFilters = () => usePostStore((s) => s.filters);
export const usePostPagination = () => usePostStore((s) => s.pagination);
export const usePostLoading = () => usePostStore((s) => s.isLoading);
