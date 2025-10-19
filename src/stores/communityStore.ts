import { create } from 'zustand';

interface Community {
  id: string;
  name: string;
  title: string;
  about: string;
  description: string;
  subscribers: number;
  posts: number;
  created: string;
  avatar?: string;
  coverImage?: string;
  team: CommunityMember[];
}

interface CommunityMember {
  username: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
}

interface CommunityState {
  communities: Community[];
  selectedCommunity: Community | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    search?: string;
    sort?: 'subscribers' | 'posts' | 'created' | 'name';
  };
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
  };
}

interface CommunityActions {
  setCommunities: (communities: Community[]) => void;
  addCommunities: (communities: Community[]) => void;
  setSelectedCommunity: (community: Community | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<CommunityState['filters']>) => void;
  setPagination: (pagination: Partial<CommunityState['pagination']>) => void;
  updateCommunity: (communityId: string, updates: Partial<Community>) => void;
  clearCommunities: () => void;
}

export const useCommunityStore = create<CommunityState & CommunityActions>((set, get) => ({
  // State
  communities: [],
  selectedCommunity: null,
  isLoading: false,
  error: null,
  filters: {
    sort: 'subscribers',
  },
  pagination: {
    hasMore: false,
  },

  // Actions
  setCommunities: (communities) => set({ communities }),

  addCommunities: (newCommunities) => {
    const currentCommunities = get().communities;
    const existingIds = new Set(currentCommunities.map(c => c.id));
    const uniqueNewCommunities = newCommunities.filter(c => !existingIds.has(c.id));
    set({ communities: [...currentCommunities, ...uniqueNewCommunities] });
  },

  setSelectedCommunity: (community) => set({ selectedCommunity: community }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setFilters: (newFilters) => {
    const currentFilters = get().filters;
    set({ 
      filters: { ...currentFilters, ...newFilters },
      communities: [], // Clear communities when filters change
    });
  },

  setPagination: (pagination) => set({ pagination: { ...get().pagination, ...pagination } }),

  updateCommunity: (communityId, updates) => {
    const communities = get().communities.map(community => 
      community.id === communityId ? { ...community, ...updates } : community
    );
    set({ communities });
  },

  clearCommunities: () => set({ communities: [], pagination: { hasMore: false } }),
}));
