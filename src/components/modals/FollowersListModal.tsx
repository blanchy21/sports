'use client';

import React from 'react';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { Users } from 'lucide-react';
import { BaseModal } from '@/components/core/BaseModal';
import { useFollowers, useFollowing } from '@/lib/react-query/queries/useFollowers';

interface FollowersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const FollowersListModal: React.FC<FollowersListModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const username = data?.username as string;
  const type = data?.type as 'followers' | 'following';

  const { data: followersData, isLoading: isLoadingFollowers } = useFollowers(username || '', {
    enabled: isOpen && type === 'followers' && !!username,
  });

  const { data: followingData, isLoading: isLoadingFollowing } = useFollowing(username || '', {
    enabled: isOpen && type === 'following' && !!username,
  });

  const isLoading = type === 'followers' ? isLoadingFollowers : isLoadingFollowing;
  const relationships =
    type === 'followers' ? followersData?.relationships || [] : followingData?.relationships || [];

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
      className="flex max-h-[80vh] flex-col"
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-gray-300"></div>
                <div className="flex-1">
                  <div className="mb-2 h-4 w-1/3 rounded bg-gray-300"></div>
                  <div className="h-3 w-1/2 rounded bg-gray-300"></div>
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
                  className="flex cursor-pointer items-center space-x-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                  onClick={() => handleUserClick(displayUsername)}
                >
                  <Avatar fallback={displayUsername} alt={displayUsername} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">@{displayUsername}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">{type === 'followers' ? '👥' : '👤'}</div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              {type === 'followers' ? 'No Followers Yet' : 'Not Following Anyone'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {type === 'followers'
                ? "This user hasn't gained any followers yet."
                : "This user isn't following anyone yet."}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end space-x-3 border-t p-4 sm:p-6">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </BaseModal>
  );
};
