"use client";

import React from "react";
import Link from "next/link";
import { useCommunityMembers } from "@/lib/react-query/queries/useCommunity";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Users, Crown, Shield, User } from "lucide-react";
import { CommunityMember } from "@/types";

interface CommunityMembersProps {
  communityId: string;
  className?: string;
}

export const CommunityMembers: React.FC<CommunityMembersProps> = ({ communityId, className }) => {
  const { data: members, isLoading, error } = useCommunityMembers(communityId, 50);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'moderator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Error Loading Members
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Failed to load community members. Please try again later.
        </p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  const membersList = members || [];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Members ({membersList.length})</span>
        </h2>
      </div>

      {membersList.length > 0 ? (
        <div className="space-y-2">
          {membersList.map((member) => (
            <MemberCard key={member.username} member={member} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Members Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            This community doesn't have any members yet.
          </p>
        </div>
      )}
    </div>
  );
};

interface MemberCardProps {
  member: CommunityMember;
}

const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <Link href={`/user/${member.username}`}>
        <div className="flex items-center space-x-3">
          <Avatar
            fallback={member.username}
            alt={member.username}
            size="md"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium hover:text-primary transition-colors">
                @{member.username}
              </span>
              <Badge 
                variant="secondary" 
                className={`text-xs ${getRoleColor(member.role)}`}
              >
                <div className="flex items-center space-x-1">
                  {getRoleIcon(member.role)}
                  <span className="capitalize">{member.role}</span>
                </div>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Link>
    </Card>
  );
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin':
      return <Crown className="h-3 w-3" />;
    case 'moderator':
      return <Shield className="h-3 w-3" />;
    default:
      return <User className="h-3 w-3" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'moderator':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};
