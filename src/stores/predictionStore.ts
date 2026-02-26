import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { PredictionBite } from '@/lib/predictions/types';

interface PredictionState {
  selectedPrediction: PredictionBite | null;
  stakeModalOpen: boolean;
  stakeOutcomeId: string | null;
  settlementPanelOpen: boolean;
}

interface PredictionActions {
  openStakeModal: (predictionId: string, outcomeId: string) => void;
  closeStakeModal: () => void;
  openSettlementPanel: (prediction: PredictionBite) => void;
  closeSettlementPanel: () => void;
  setSelectedPrediction: (prediction: PredictionBite | null) => void;
}

export const usePredictionStore = create<PredictionState & PredictionActions>()(
  devtools(
    immer((set) => ({
      // State
      selectedPrediction: null,
      stakeModalOpen: false,
      stakeOutcomeId: null,
      settlementPanelOpen: false,

      // Actions
      openStakeModal: (_predictionId, outcomeId) =>
        set((state) => {
          state.stakeModalOpen = true;
          state.stakeOutcomeId = outcomeId;
        }),

      closeStakeModal: () =>
        set((state) => {
          state.stakeModalOpen = false;
          state.stakeOutcomeId = null;
        }),

      openSettlementPanel: (prediction) =>
        set((state) => {
          state.selectedPrediction = prediction;
          state.settlementPanelOpen = true;
        }),

      closeSettlementPanel: () =>
        set((state) => {
          state.settlementPanelOpen = false;
        }),

      setSelectedPrediction: (prediction) =>
        set((state) => {
          state.selectedPrediction = prediction;
        }),
    })),
    { name: 'PredictionStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// Granular selectors
export const useSelectedPrediction = () => usePredictionStore((s) => s.selectedPrediction);
export const useStakeModalState = () =>
  usePredictionStore((s) => ({
    isOpen: s.stakeModalOpen,
    outcomeId: s.stakeOutcomeId,
  }));
export const useSettlementPanelOpen = () => usePredictionStore((s) => s.settlementPanelOpen);
