"use client";

import React from "react";
import Link from "next/link";
import { useCommunity } from "@/lib/react-query/queries/useCommunity";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Crown, Shield, User, Calendar } from "lucide-react";

interface CommunityTeamProps {
  communityId: string;
  className?: string;
}

export const CommunityTeam: React.FC<CommunityTeamProps> = ({ communityId, className }) => {
  const { data: community, isLoading, error } = useCommunity(communityId);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-5 w-5 text-blue-500" />;
      default:
        return <User className="h-5 w-5 text-muted-foreground" />;
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

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Community administrator with full control';
      case 'moderator':
        return 'Community moderator with content management rights';
      default:
        return 'Community member';
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-300 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Error Loading Team
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Failed to load community team information.
        </p>
      </div>
    );
  }

  const team = community.team || [];

  // Group team members by role
  const admins = team.filter(member => member.role === 'admin');
  const moderators = team.filter(member => member.role === 'moderator');
  const members = team.filter(member => member.role === 'member');

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold mb-2">Community Team</h2>
        <p className="text-muted-foreground">
          Meet the people who help manage and moderate this community.
        </p>
      </div>

      {/* Admins */}
      {admins.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span>Administrators ({admins.length})</span>
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {admins.map((member) => (
              <TeamMemberCard key={member.username} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Moderators */}
      {moderators.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Moderators ({moderators.length})</span>
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {moderators.map((member) => (
              <TeamMemberCard key={member.username} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      {members.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <span>Members ({members.length})</span>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <TeamMemberCard key={member.username} member={member} />
            ))}
          </div>
        </div>
      )}

      {team.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Team Information
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Team information is not available for this community.
          </p>
        </div>
      )}
    </div>
  );
};

interface TeamMemberCardProps {
  member: {
    username: string;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
  };
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ member }) => {
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

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Community administrator with full control';
      case 'moderator':
        return 'Community moderator with content management rights';
      default:
        return 'Community member';
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <Link href={`/user/${member.username}`}>
        <div className="flex items-start space-x-3">
          <Avatar
            fallback={member.username}
            alt={member.username}
            size="md"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
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
            
            <p className="text-sm text-muted-foreground mb-2">
              {getRoleDescription(member.role)}
            </p>
            
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
};
