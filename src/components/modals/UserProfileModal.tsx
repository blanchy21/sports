'use client';

import React, { useState } from 'react';
import {
  useUserProfile,
  useUserFollowerCount,
  useUserFollowingCount,
  useIsFollowingUser,
} from '@/lib/react-query/queries/useUserProfile';
import { useFollowUser, useUnfollowUser } from '@/lib/react-query/queries/useFollowers';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { UserPlus, UserMinus, Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils/client';
import { BaseModal } from '@/components/core/BaseModal';
import { logger } from '@/lib/logger';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, data }) => {
  const username = data?.username as string;
  const { user: currentUser } = useAuth();
  const { data: profile, isLoading, error } = useUserProfile(username || '');
  const { data: followerCount } = useUserFollowerCount(username || '');
  const { data: followingCount } = useUserFollowingCount(username || '');

  // Follow/unfollow functionality - only check Hive follow status for Hive users
  const hiveFollower = currentUser?.isHiveAuth
    ? currentUser.hiveUsername || currentUser.username
    : '';
  const {
    data: isFollowing,
    isLoading: isCheckingFollow,
    refetch: refetchIsFollowing,
  } = useIsFollowingUser(username || '', hiveFollower);

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const handleFollowToggle = async () => {
    if (!username || !currentUser?.username) {
      alert('Please login to follow users');
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        const result = await unfollowMutation.mutateAsync({
          username,
          follower: currentUser.username,
        });
        if (!result.success) {
          alert(`Failed to unfollow: ${result.error || 'Unknown error'}`);
        }
      } else {
        const result = await followMutation.mutateAsync({
          username,
          follower: currentUser.username,
        });
        if (!result.success) {
          alert(`Failed to follow: ${result.error || 'Unknown error'}`);
        }
      }

      // Manually refetch the follow status to update the UI immediately
      setTimeout(() => {
        refetchIsFollowing();
      }, 500);
    } catch (error) {
      logger.error('Error toggling follow status', 'UserProfileModal', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFollowLoading(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile"
      size="md"
      className="flex max-h-[80vh] flex-col"
    >
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gray-300"></div>
              <div className="flex-1">
                <div className="mb-2 h-6 w-1/3 rounded bg-gray-300"></div>
                <div className="h-4 w-1/2 rounded bg-gray-300"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-gray-300"></div>
              <div className="h-4 w-3/4 rounded bg-gray-300"></div>
            </div>
          </div>
        ) : error || !profile ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">⚠️</div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Profile Not Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">Unable to load user profile.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center space-x-4">
              <Avatar
                src={profile.profile?.profileImage}
                fallback={username}
                alt={profile.profile?.name || username}
                size="lg"
                className="h-16 w-16"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xl font-bold">{profile.profile?.name || username}</h3>
                <p className="text-muted-foreground">@{username}</p>
                {profile.reputationFormatted && (
                  <p className="text-sm text-muted-foreground">
                    Reputation: {profile.reputationFormatted}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <div className="text-2xl font-bold">{followerCount || 0}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <div className="text-2xl font-bold">{followingCount || 0}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </div>
            </div>

            {/* Profile Info */}
            {profile.profile?.about && (
              <div>
                <h4 className="mb-2 font-semibold">About</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {profile.profile.about}
                </p>
              </div>
            )}

            {/* Profile Details */}
            <div className="space-y-3">
              {profile.profile?.location && (
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.profile.location}</span>
                </div>
              )}

              {profile.profile?.website && (
                <div className="flex items-center space-x-2 text-sm">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={profile.profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {profile.profile.website}
                  </a>
                </div>
              )}

              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatDate(profile.createdAt)}</span>
              </div>
            </div>

            {/* Account Stats */}
            <div className="space-y-3">
              <h4 className="font-semibold">Account Stats</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">HIVE Balance:</span>
                  <div className="font-medium">
                    {profile.hiveBalance?.toFixed(3) || '0.000'} HIVE
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">HBD Balance:</span>
                  <div className="font-medium">{profile.hbdBalance?.toFixed(3) || '0.000'} HBD</div>
                </div>
                <div>
                  <span className="text-muted-foreground">HIVE Power:</span>
                  <div className="font-medium">{profile.hivePower?.toFixed(3) || '0.000'} HP</div>
                </div>
                <div>
                  <span className="text-muted-foreground">RC:</span>
                  <div className="font-medium">{profile.resourceCredits?.toFixed(1) || '0.0'}%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end space-x-3 border-t p-6">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {profile && currentUser?.username && currentUser.username !== username && (
          <Button
            onClick={handleFollowToggle}
            disabled={isFollowLoading || isCheckingFollow}
            variant={isFollowing ? 'outline' : 'default'}
          >
            {isFollowLoading ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isFollowing ? (
              <UserMinus className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isFollowLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
        )}
      </div>
    </BaseModal>
  );
};
