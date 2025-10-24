"use client";

import React, { createContext, useContext } from "react";
import { useUIStore } from "@/stores/uiStore";
import { CommentsModal } from "./CommentsModal";
import { UpvoteListModal } from "./UpvoteListModal";
import { DescriptionModal } from "./DescriptionModal";
import { UserProfileModal } from "./UserProfileModal";

interface ModalContextType {
  openModal: (type: 'comments' | 'upvoteList' | 'description' | 'userProfile', data?: Record<string, unknown>) => void;
  closeModal: (type: 'comments' | 'upvoteList' | 'description' | 'userProfile') => void;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

interface ModalProviderProps {
  children: React.ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const { openModal, closeModal, closeAllModals, modals } = useUIStore();

  const contextValue: ModalContextType = {
    openModal,
    closeModal,
    closeAllModals,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      
      {/* Render modals based on state */}
      {modals.comments.isOpen && (
        <CommentsModal 
          isOpen={modals.comments.isOpen}
          onClose={() => closeModal('comments')}
          data={modals.comments.data}
        />
      )}
      
      {modals.upvoteList.isOpen && (
        <UpvoteListModal 
          isOpen={modals.upvoteList.isOpen}
          onClose={() => closeModal('upvoteList')}
          data={modals.upvoteList.data}
        />
      )}
      
      {modals.description.isOpen && (
        <DescriptionModal 
          isOpen={modals.description.isOpen}
          onClose={() => closeModal('description')}
          data={modals.description.data}
        />
      )}
      
      {modals.userProfile.isOpen && (
        <UserProfileModal 
          isOpen={modals.userProfile.isOpen}
          onClose={() => closeModal('userProfile')}
          data={modals.userProfile.data}
        />
      )}
    </ModalContext.Provider>
  );
};
