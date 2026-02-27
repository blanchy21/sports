'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { FollowButtonCompact } from '@/components/user/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface SoftFollowersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  type: 'followers' | 'following';
}

interface FollowUser {
  id: string;
  userId: string;
  username: string;
  createdAt: string;
  isFollowing?: boolean;
}

export const SoftFollowersListModal: React.FC<SoftFollowersListModalProps> = ({
  isOpen,
  onClose,
  userId,
  username,
  type,
}) => {
  const router = useRouter();
  const { user: currentUser, authType } = useAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          userId,
          type,
          limit: '20',
          offset: '0',
        });

        const response = await fetch(`/api/soft/follows?${params}`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
          setHasMore(data.pagination?.hasMore || false);
          setOffset(20);
        }
      } catch (error) {
        logger.error('Failed to fetch followers', 'SoftFollowersListModal', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, userId, type, currentUser?.id, authType]);

  const loadMore = async () => {
    try {
      const params = new URLSearchParams({
        userId,
        type,
        limit: '20',
        offset: offset.toString(),
      });

      const response = await fetch(`/api/soft/follows?${params}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUsers((prev) => [...prev, ...(data.users || [])]);
        setHasMore(data.pagination?.hasMore || false);
        setOffset((prev) => prev + 20);
      }
    } catch (error) {
      logger.error('Failed to load more followers', 'SoftFollowersListModal', error);
    }
  };

  const handleUserClick = (username: string) => {
    onClose();
    router.push(`/user/${username}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative mx-2 max-h-[80vh] w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-xl sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {type === 'followers' ? 'Followers' : 'Following'}
            </h2>
            <span className="text-sm text-muted-foreground">@{username}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div
                    className="flex flex-1 cursor-pointer items-center space-x-3"
                    onClick={() => handleUserClick(user.username)}
                  >
                    <Avatar fallback={user.username} size="sm" />
                    <div>
                      <p className="font-medium text-foreground">@{user.username}</p>
                    </div>
                  </div>
                  {currentUser?.id !== user.userId && (
                    <FollowButtonCompact
                      targetUserId={user.userId}
                      targetUsername={user.username}
                      initialIsFollowing={user.isFollowing}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && !isLoading && (
          <div className="border-t border-border p-4">
            <Button variant="outline" className="w-full" onClick={loadMore}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
