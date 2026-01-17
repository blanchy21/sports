import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  persist(
    (set, get) => ({
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

      // Communities list actions
      setCommunities: (communities) => set({ communities }),

      addCommunities: (newCommunities) => {
        const currentCommunities = get().communities;
        const existingIds = new Set(currentCommunities.map((c) => c.id));
        const uniqueNewCommunities = newCommunities.filter((c) => !existingIds.has(c.id));
        set({ communities: [...currentCommunities, ...uniqueNewCommunities] });
      },

      clearCommunities: () => set({ communities: [], pagination: { hasMore: false } }),

      // User communities actions
      setUserCommunities: (communities) => set({ userCommunities: communities }),

      addUserCommunity: (community) => {
        const current = get().userCommunities;
        if (!current.some((c) => c.id === community.id)) {
          set({ userCommunities: [...current, community] });
        }
      },

      removeUserCommunity: (communityId) => {
        const current = get().userCommunities;
        set({ userCommunities: current.filter((c) => c.id !== communityId) });
      },

      // Selection actions
      setSelectedCommunity: (community) => set({ selectedCommunity: community }),

      // Loading/Error actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Filter actions
      setFilters: (newFilters) => {
        const currentFilters = get().filters;
        set({
          filters: { ...currentFilters, ...newFilters },
          communities: [], // Clear communities when filters change
        });
      },

      resetFilters: () => set({ filters: DEFAULT_FILTERS, communities: [] }),

      // Pagination actions
      setPagination: (pagination) =>
        set({ pagination: { ...get().pagination, ...pagination } }),

      // Update community
      updateCommunity: (communityId, updates) => {
        const communities = get().communities.map((community) =>
          community.id === communityId ? { ...community, ...updates } : community
        );
        const userCommunities = get().userCommunities.map((community) =>
          community.id === communityId ? { ...community, ...updates } : community
        );
        set({ communities, userCommunities });
      },
    }),
    {
      name: 'sportsblock-communities',
      partialize: (state) => ({
        // Only persist user communities (for faster loading)
        userCommunities: state.userCommunities,
        filters: state.filters,
      }),
    }
  )
);
