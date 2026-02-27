import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Post } from '@/types';
import { SportsblockPost } from '@/lib/hive-workerbee/content';

interface PostState {
  selectedPost: (Post | SportsblockPost) | null;
  filters: {
    sportCategory?: string;
    author?: string;
    tag?: string;
    sort?: 'trending' | 'created' | 'payout' | 'votes';
  };
}

interface PostActions {
  setSelectedPost: (post: (Post | SportsblockPost) | null) => void;
  setFilters: (filters: Partial<PostState['filters']>) => void;
}

export const usePostStore = create<PostState & PostActions>()(
  devtools(
    (set) => ({
      selectedPost: null,
      filters: {
        sort: 'created',
      },

      setSelectedPost: (post) => set({ selectedPost: post }),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),
    }),
    { name: 'PostStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// Granular selectors
export const useSelectedPost = () => usePostStore((s) => s.selectedPost);
export const usePostFilters = () => usePostStore((s) => s.filters);
