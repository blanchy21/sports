"use client";

import React, { createContext, useContext } from "react";
import dynamic from "next/dynamic";
import { useUIStore } from "@/stores/uiStore";

// Lazy load modals - only loaded when first opened
const CommentsModal = dynamic(() => import("./CommentsModal").then(mod => ({ default: mod.CommentsModal })), {
  ssr: false,
});
const UpvoteListModal = dynamic(() => import("./UpvoteListModal").then(mod => ({ default: mod.UpvoteListModal })), {
  ssr: false,
});
const DescriptionModal = dynamic(() => import("./DescriptionModal").then(mod => ({ default: mod.DescriptionModal })), {
  ssr: false,
});
const UserProfileModal = dynamic(() => import("./UserProfileModal").then(mod => ({ default: mod.UserProfileModal })), {
  ssr: false,
});
const FollowersListModal = dynamic(() => import("./FollowersListModal").then(mod => ({ default: mod.FollowersListModal })), {
  ssr: false,
});
const KeychainLoginModal = dynamic(() => import("./KeychainLoginModal").then(mod => ({ default: mod.KeychainLoginModal })), {
  ssr: false,
});
const SoftCommentsModal = dynamic(() => import("./SoftCommentsModal").then(mod => ({ default: mod.SoftCommentsModal })), {
  ssr: false,
});
const SoftFollowersListModal = dynamic(() => import("./SoftFollowersListModal").then(mod => ({ default: mod.SoftFollowersListModal })), {
  ssr: false,
});
const EditProfileModal = dynamic(() => import("./EditProfileModal").then(mod => ({ default: mod.EditProfileModal })), {
  ssr: false,
});

interface ModalContextType {
  openModal: (type: 'comments' | 'upvoteList' | 'description' | 'userProfile' | 'followersList' | 'keychainLogin' | 'softComments' | 'softFollowersList' | 'editProfile', data?: Record<string, unknown>) => void;
  closeModal: (type: 'comments' | 'upvoteList' | 'description' | 'userProfile' | 'followersList' | 'keychainLogin' | 'softComments' | 'softFollowersList' | 'editProfile') => void;
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
      
      {modals.followersList.isOpen && (
        <FollowersListModal
          isOpen={modals.followersList.isOpen}
          onClose={() => closeModal('followersList')}
          data={modals.followersList.data}
        />
      )}

      {modals.keychainLogin.isOpen && (
        <KeychainLoginModal
          isOpen={modals.keychainLogin.isOpen}
          onClose={() => closeModal('keychainLogin')}
          data={modals.keychainLogin.data}
        />
      )}

      {modals.softComments.isOpen && (
        <SoftCommentsModal
          isOpen={modals.softComments.isOpen}
          onClose={() => closeModal('softComments')}
          data={modals.softComments.data}
        />
      )}

      {modals.softFollowersList.isOpen && (
        <SoftFollowersListModal
          isOpen={modals.softFollowersList.isOpen}
          onClose={() => closeModal('softFollowersList')}
          userId={modals.softFollowersList.data?.userId as string || ''}
          username={modals.softFollowersList.data?.username as string || ''}
          type={(modals.softFollowersList.data?.type as 'followers' | 'following') || 'followers'}
        />
      )}

      {modals.editProfile.isOpen && (
        <EditProfileModal
          isOpen={modals.editProfile.isOpen}
          onClose={() => closeModal('editProfile')}
          data={modals.editProfile.data}
        />
      )}
    </ModalContext.Provider>
  );
};
