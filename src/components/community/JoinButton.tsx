"use client";

import React from "react";
import { Users, UserPlus, UserMinus, Clock, Loader2, Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMembership,
  useJoinCommunity,
  useLeaveCommunity,
} from "@/lib/react-query/queries/useCommunity";
import { Community } from "@/types";
import { cn } from "@/lib/utils";

interface JoinButtonProps {
  community: Community;
  className?: string;
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
}

export const JoinButton: React.FC<JoinButtonProps> = ({
  community,
  className,
  size = "default",
  showIcon = true,
}) => {
  const { user, hiveUser, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id || '';

  const { data: membership, isLoading: isMembershipLoading } = useMembership(
    community.id,
    userId
  );

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
      <Button
        variant="outline"
        size={size}
        className={className}
        disabled
      >
        {showIcon && <UserPlus className="h-4 w-4 mr-2" />}
        Sign in to Join
      </Button>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        disabled
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
        className={cn("text-red-500 border-red-500", className)}
        disabled
      >
        {showIcon && <Ban className="h-4 w-4 mr-2" />}
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
        className={cn("text-yellow-600 border-yellow-600", className)}
        disabled
      >
        {showIcon && <Clock className="h-4 w-4 mr-2" />}
        Pending Approval
      </Button>
    );
  }

  // Active member
  if (membership?.status === 'active') {
    const roleLabel = membership.role === 'admin' 
      ? 'Admin' 
      : membership.role === 'moderator' 
        ? 'Moderator' 
        : 'Member';

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant="outline"
          size={size}
          onClick={handleLeave}
          className="group"
        >
          {showIcon && <Users className="h-4 w-4 mr-2 group-hover:hidden" />}
          {showIcon && <UserMinus className="h-4 w-4 mr-2 hidden group-hover:block" />}
          <span className="group-hover:hidden">{roleLabel}</span>
          <span className="hidden group-hover:block text-red-500">Leave</span>
        </Button>
      </div>
    );
  }

  // Not a member - show join button
  const buttonLabel = community.type === 'public' 
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
      {showIcon && <UserPlus className="h-4 w-4 mr-2" />}
      {buttonLabel}
    </Button>
  );
};
