"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Users } from "lucide-react";
import { BaseModal } from "@/components/ui/BaseModal";
import { useFollowers, useFollowing } from "@/lib/react-query/queries/useFollowers";

interface FollowersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const FollowersListModal: React.FC<FollowersListModalProps> = ({ isOpen, onClose, data }) => {
  const username = data?.username as string;
  const type = data?.type as 'followers' | 'following';

  const { data: followersData, isLoading: isLoadingFollowers } = useFollowers(username || '', {
    enabled: isOpen && type === 'followers' && !!username,
  });

  const { data: followingData, isLoading: isLoadingFollowing } = useFollowing(username || '', {
    enabled: isOpen && type === 'following' && !!username,
  });

  const isLoading = type === 'followers' ? isLoadingFollowers : isLoadingFollowing;
  const relationships = type === 'followers' 
    ? followersData?.relationships || [] 
    : followingData?.relationships || [];

  const handleUserClick = (targetUsername: string) => {
    window.location.href = `/user/${targetUsername}`;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>{type === 'followers' ? 'Followers' : 'Following'}</span>
        </div>
      }
      size="md"
      className="max-h-[80vh] flex flex-col"
    >
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : relationships.length > 0 ? (
          <div className="space-y-3">
            {relationships.map((rel) => {
              const displayUsername = type === 'followers' ? rel.follower : rel.following;
              return (
                <div
                  key={`${rel.follower}-${rel.following}`}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(displayUsername)}
                >
                  <Avatar
                    fallback={displayUsername}
                    alt={displayUsername}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      @{displayUsername}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {type === 'followers' ? '👥' : '👤'}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {type === 'followers' ? 'No Followers Yet' : 'Not Following Anyone'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {type === 'followers' 
                ? 'This user hasn\'t gained any followers yet.' 
                : 'This user isn\'t following anyone yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end space-x-3 p-6 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </BaseModal>
  );
};
