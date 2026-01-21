import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Community, CommunityFilters } from '@/types';

interface CommunityState {
  // All communities (cache)
  communities: Community[];
  // User's joined communities
  userCommunities: Community[];
  // Currently selected community
  selectedCommunity: Community | null;
  // Loading state
  isLoading: boolean;
  // Error state
  error: string | null;
  // Current filters
  filters: CommunityFilters;
  // Pagination state
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
  };
}

interface CommunityActions {
  // Communities list actions
  setCommunities: (communities: Community[]) => void;
  addCommunities: (communities: Community[]) => void;
  clearCommunities: () => void;
  
  // User communities actions
  setUserCommunities: (communities: Community[]) => void;
  addUserCommunity: (community: Community) => void;
  removeUserCommunity: (communityId: string) => void;
  
  // Selection actions
  setSelectedCommunity: (community: Community | null) => void;
  
  // Loading/Error actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Filter actions
  setFilters: (filters: Partial<CommunityFilters>) => void;
  resetFilters: () => void;
  
  // Pagination actions
  setPagination: (pagination: Partial<CommunityState['pagination']>) => void;
  
  // Update community
  updateCommunity: (communityId: string, updates: Partial<Community>) => void;
}

const DEFAULT_FILTERS: CommunityFilters = {
  sort: 'memberCount',
  limit: 20,
};

export const useCommunityStore = create<CommunityState & CommunityActions>()(
  devtools(
    persist(
      immer((set, get) => ({
      // Initial state
      communities: [],
      userCommunities: [],
      selectedCommunity: null,
      isLoading: false,
      error: null,
      filters: DEFAULT_FILTERS,
      pagination: {
        hasMore: false,
      },

      // Communities list actions - using immer for safe mutable-style updates
      setCommunities: (communities) => set((state) => {
        state.communities = communities;
      }),

      addCommunities: (newCommunities) => set((state) => {
        const existingIds = new Set(state.communities.map((c) => c.id));
        const uniqueNewCommunities = newCommunities.filter((c) => !existingIds.has(c.id));
        state.communities.push(...uniqueNewCommunities);
      }),

      clearCommunities: () => set((state) => {
        state.communities = [];
        state.pagination.hasMore = false;
      }),

      // User communities actions
      setUserCommunities: (communities) => set((state) => {
        state.userCommunities = communities;
      }),

      addUserCommunity: (community) => {
        if (!get().userCommunities.some((c) => c.id === community.id)) {
          set((state) => {
            state.userCommunities.push(community);
          });
        }
      },

      removeUserCommunity: (communityId) => set((state) => {
        const index = state.userCommunities.findIndex((c) => c.id === communityId);
        if (index !== -1) {
          state.userCommunities.splice(index, 1);
        }
      }),

      // Selection actions
      setSelectedCommunity: (community) => set((state) => {
        state.selectedCommunity = community;
      }),

      // Loading/Error actions
      setLoading: (loading) => set((state) => {
        state.isLoading = loading;
      }),

      setError: (error) => set((state) => {
        state.error = error;
      }),

      // Filter actions
      setFilters: (newFilters) => set((state) => {
        Object.assign(state.filters, newFilters);
        state.communities = []; // Clear communities when filters change
      }),

      resetFilters: () => set((state) => {
        state.filters = DEFAULT_FILTERS;
        state.communities = [];
      }),

      // Pagination actions
      setPagination: (pagination) => set((state) => {
        Object.assign(state.pagination, pagination);
      }),

      // Update community
      updateCommunity: (communityId, updates) => set((state) => {
        const communityIndex = state.communities.findIndex((c) => c.id === communityId);
        if (communityIndex !== -1) {
          Object.assign(state.communities[communityIndex], updates);
        }

        const userCommunityIndex = state.userCommunities.findIndex((c) => c.id === communityId);
        if (userCommunityIndex !== -1) {
          Object.assign(state.userCommunities[userCommunityIndex], updates);
        }
      }),
    })),
      {
        name: 'sportsblock-communities',
        partialize: (state) => ({
          // Only persist user communities (for faster loading)
          userCommunities: state.userCommunities,
          filters: state.filters,
        }),
      }
    ),
    { name: 'CommunityStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
