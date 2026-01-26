import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ModalState {
  isOpen: boolean;
  type: 'comments' | 'upvoteList' | 'description' | 'userProfile' | 'keychainLogin' | 'softComments' | 'softFollowersList' | 'editProfile' | null;
  data: Record<string, unknown> | null;
}

interface UIState {
  modals: {
    comments: ModalState;
    upvoteList: ModalState;
    description: ModalState;
    userProfile: ModalState;
    followersList: ModalState;
    keychainLogin: ModalState;
    softComments: ModalState;
    softFollowersList: ModalState;
    editProfile: ModalState;
  };
  sidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedSport: string;
  theme: 'light' | 'dark';
  recentTags: string[];
}

interface UIActions {
  openModal: (type: keyof UIState['modals'], data?: Record<string, unknown>) => void;
  closeModal: (type: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  setSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setSelectedSport: (sport: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  toggleRightSidebar: () => void;
  addRecentTags: (tags: string[]) => void;
  clearRecentTags: () => void;
}

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    persist(
      (set) => ({
      // State
      modals: {
        comments: { isOpen: false, type: null, data: null },
        upvoteList: { isOpen: false, type: null, data: null },
        description: { isOpen: false, type: null, data: null },
        userProfile: { isOpen: false, type: null, data: null },
        followersList: { isOpen: false, type: null, data: null },
        keychainLogin: { isOpen: false, type: null, data: null },
        softComments: { isOpen: false, type: null, data: null },
        softFollowersList: { isOpen: false, type: null, data: null },
        editProfile: { isOpen: false, type: null, data: null },
      },
      sidebarOpen: true,
      rightSidebarOpen: true,
      selectedSport: '',
      theme: 'light',
      recentTags: [],

      // Actions
      openModal: (type, data = {}) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [type]: {
              isOpen: true,
              type,
              data,
            },
          },
        }));
      },

      closeModal: (type) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [type]: {
              isOpen: false,
              type: null,
              data: null,
            },
          },
        }));
      },

      closeAllModals: () => {
        set(() => ({
          modals: {
            comments: { isOpen: false, type: null, data: null },
            upvoteList: { isOpen: false, type: null, data: null },
            description: { isOpen: false, type: null, data: null },
            userProfile: { isOpen: false, type: null, data: null },
            followersList: { isOpen: false, type: null, data: null },
            keychainLogin: { isOpen: false, type: null, data: null },
            softComments: { isOpen: false, type: null, data: null },
            softFollowersList: { isOpen: false, type: null, data: null },
            editProfile: { isOpen: false, type: null, data: null },
          },
        }));
      },

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),

      setSelectedSport: (sport) => set({ selectedSport: sport }),

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),

      addRecentTags: (tags) =>
        set((state) => {
          // Add new tags to the beginning, remove duplicates, limit to 20
          const uniqueTags = [...new Set([...tags, ...state.recentTags])].slice(0, 20);
          return { recentTags: uniqueTags };
        }),

      clearRecentTags: () => set({ recentTags: [] }),
      }),
      {
        name: 'ui-store',
        // Only persist recentTags to localStorage
        partialize: (state) => ({ recentTags: state.recentTags }),
      }
    ),
    { name: 'UIStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
