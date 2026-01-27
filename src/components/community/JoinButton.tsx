'use client';

import React from 'react';
import { Users, UserPlus, UserMinus, Clock, Loader2, Ban } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMembership,
  useJoinCommunity,
  useLeaveCommunity,
} from '@/lib/react-query/queries/useCommunity';
import { Community } from '@/types';
import { cn } from '@/lib/utils/client';

interface JoinButtonProps {
  community: Community;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

export const JoinButton: React.FC<JoinButtonProps> = ({
  community,
  className,
  size = 'default',
  showIcon = true,
}) => {
  const { user, hiveUser, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id || '';

  const { data: membership, isLoading: isMembershipLoading } = useMembership(community.id, userId);

  const joinMutation = useJoinCommunity();
  const leaveMutation = useLeaveCommunity();

  const isLoading = isMembershipLoading || joinMutation.isPending || leaveMutation.isPending;

  const handleJoin = async () => {
    if (!user) return;

    await joinMutation.mutateAsync({
      communityId: community.id,
      userId: user.id,
      username: user.username,
      hiveUsername: hiveUser?.username,
    });
  };

  const handleLeave = async () => {
    if (!user) return;

    if (membership?.role === 'admin') {
      alert('As the only admin, you cannot leave. Transfer ownership first.');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to leave ${community.name}?`);
    if (!confirmed) return;

    await leaveMutation.mutateAsync({
      communityId: community.id,
      userId: user.id,
    });
  };

  // Not authenticated
  if (isAuthLoading || !user) {
    return (
      <Button variant="outline" size={size} className={className} disabled>
        {showIcon && <UserPlus className="mr-2 h-4 w-4" />}
        Sign in to Join
      </Button>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Button variant="outline" size={size} className={className} disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Banned
  if (membership?.status === 'banned') {
    return (
      <Button
        variant="outline"
        size={size}
        className={cn('border-red-500 text-red-500', className)}
        disabled
      >
        {showIcon && <Ban className="mr-2 h-4 w-4" />}
        Banned
      </Button>
    );
  }

  // Pending approval
  if (membership?.status === 'pending') {
    return (
      <Button
        variant="outline"
        size={size}
        className={cn('border-yellow-600 text-yellow-600', className)}
        disabled
      >
        {showIcon && <Clock className="mr-2 h-4 w-4" />}
        Pending Approval
      </Button>
    );
  }

  // Active member
  if (membership?.status === 'active') {
    const roleLabel =
      membership.role === 'admin'
        ? 'Admin'
        : membership.role === 'moderator'
          ? 'Moderator'
          : 'Member';

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button variant="outline" size={size} onClick={handleLeave} className="group">
          {showIcon && <Users className="mr-2 h-4 w-4 group-hover:hidden" />}
          {showIcon && <UserMinus className="mr-2 hidden h-4 w-4 group-hover:block" />}
          <span className="group-hover:hidden">{roleLabel}</span>
          <span className="hidden text-red-500 group-hover:block">Leave</span>
        </Button>
      </div>
    );
  }

  // Not a member - show join button
  const buttonLabel =
    community.type === 'public'
      ? 'Join'
      : community.type === 'private'
        ? 'Request to Join'
        : 'Invite Only';

  const isInviteOnly = community.type === 'invite-only';

  return (
    <Button
      variant="default"
      size={size}
      onClick={handleJoin}
      disabled={isInviteOnly}
      className={className}
    >
      {showIcon && <UserPlus className="mr-2 h-4 w-4" />}
      {buttonLabel}
    </Button>
  );
};
