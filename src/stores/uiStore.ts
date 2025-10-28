import { create } from 'zustand';

interface ModalState {
  isOpen: boolean;
  type: 'comments' | 'upvoteList' | 'description' | 'userProfile' | null;
  data: Record<string, unknown> | null;
}

interface UIState {
  modals: {
    comments: ModalState;
    upvoteList: ModalState;
    description: ModalState;
    userProfile: ModalState;
    followersList: ModalState;
  };
  sidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedSport: string;
  theme: 'light' | 'dark';
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
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  // State
  modals: {
    comments: { isOpen: false, type: null, data: null },
    upvoteList: { isOpen: false, type: null, data: null },
    description: { isOpen: false, type: null, data: null },
    userProfile: { isOpen: false, type: null, data: null },
    followersList: { isOpen: false, type: null, data: null },
  },
  sidebarOpen: true,
  rightSidebarOpen: true,
  selectedSport: '',
  theme: 'light',

  // Actions
  openModal: (type, data = {}) => {
    set(state => ({
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
    set(state => ({
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
      },
    }));
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),

  setSelectedSport: (sport) => set({ selectedSport: sport }),

  setTheme: (theme) => set({ theme }),

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  toggleRightSidebar: () => set(state => ({ rightSidebarOpen: !state.rightSidebarOpen })),
}));
