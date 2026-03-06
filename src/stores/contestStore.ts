/**
 * Contest Store — UI state for contest interactions
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface ContestState {
  entryModalOpen: boolean;
  selectedContestSlug: string | null;
  isEntering: boolean;
}

interface ContestActions {
  openEntryModal: (slug: string) => void;
  closeEntryModal: () => void;
  setIsEntering: (value: boolean) => void;
}

export const useContestStore = create<ContestState & ContestActions>()(
  devtools(
    immer((set) => ({
      entryModalOpen: false,
      selectedContestSlug: null,
      isEntering: false,

      openEntryModal: (slug: string) =>
        set((state) => {
          if (state.isEntering) return;
          state.entryModalOpen = true;
          state.selectedContestSlug = slug;
        }),

      closeEntryModal: () =>
        set((state) => {
          state.entryModalOpen = false;
          state.selectedContestSlug = null;
        }),

      setIsEntering: (value: boolean) =>
        set((state) => {
          state.isEntering = value;
        }),
    })),
    { name: 'ContestStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
