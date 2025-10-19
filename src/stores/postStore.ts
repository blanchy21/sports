import { create } from 'zustand';
import { Post } from '@/types';
import { SportsblockPost } from '@/lib/hive-workerbee/content';

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

export const usePostStore = create<PostState & PostActions>((set, get) => ({
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

  // Actions
  setPosts: (posts) => set({ posts }),

  addPosts: (newPosts) => {
    const currentPosts = get().posts;
    const existingIds = new Set(currentPosts.map(p => 'isSportsblockPost' in p ? `${p.author}/${p.permlink}` : p.id));
    const uniqueNewPosts = newPosts.filter(p => {
      const id = 'isSportsblockPost' in p ? `${p.author}/${p.permlink}` : p.id;
      return !existingIds.has(id);
    });
    set({ posts: [...currentPosts, ...uniqueNewPosts] });
  },

  setSelectedPost: (post) => set({ selectedPost: post }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setFilters: (newFilters) => {
    const currentFilters = get().filters;
    set({ 
      filters: { ...currentFilters, ...newFilters },
      posts: [], // Clear posts when filters change
    });
  },

  setPagination: (pagination) => set({ pagination: { ...get().pagination, ...pagination } }),

  updatePost: (postId, updates) => {
    const posts = get().posts.map(post => {
      const id = 'isSportsblockPost' in post ? `${post.author}/${post.permlink}` : post.id;
      if (id === postId) {
        return { ...post, ...updates } as Post | SportsblockPost;
      }
      return post;
    });
    set({ posts });
  },

  clearPosts: () => set({ posts: [], pagination: { hasMore: false } }),
}));
