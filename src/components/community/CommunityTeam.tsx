'use client';

import React from 'react';
import Link from 'next/link';
import { useCommunity } from '@/lib/react-query/queries/useCommunity';
import { Card } from '@/components/core/Card';
import { Avatar } from '@/components/core/Avatar';
import { Badge } from '@/components/core/Badge';
import { Crown, Shield, User, Calendar } from 'lucide-react';

interface CommunityTeamProps {
  communityId: string;
  className?: string;
}

export const CommunityTeam: React.FC<CommunityTeamProps> = ({ communityId, className }) => {
  const { data: community, isLoading, error } = useCommunity(communityId);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border bg-card p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-muted"></div>
              <div className="flex-1">
                <div className="mb-2 h-5 w-1/4 rounded bg-muted"></div>
                <div className="mb-2 h-4 w-1/3 rounded bg-muted"></div>
                <div className="h-3 w-1/2 rounded bg-muted"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className={`py-12 text-center ${className}`}>
        <div className="mb-4 text-6xl">⚠️</div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">Error Loading Team</h3>
        <p className="text-muted-foreground">Failed to load community team information.</p>
      </div>
    );
  }

  const team = community.team || [];

  // Group team members by role
  const admins = team.filter((member) => member.role === 'admin');
  const moderators = team.filter((member) => member.role === 'moderator');
  const members = team.filter((member) => member.role === 'member');

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="mb-2 text-2xl font-bold">Community Team</h2>
        <p className="text-muted-foreground">
          Meet the people who help manage and moderate this community.
        </p>
      </div>

      {/* Admins */}
      {admins.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center space-x-2 text-lg font-semibold">
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
          <h3 className="mb-4 flex items-center space-x-2 text-lg font-semibold">
            <Shield className="h-5 w-5 text-accent" />
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
          <h3 className="mb-4 flex items-center space-x-2 text-lg font-semibold">
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
        <div className="py-12 text-center">
          <div className="mb-4 text-6xl">👥</div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">No Team Information</h3>
          <p className="text-muted-foreground">
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
    joinedAt: string | Date;
  };
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ member }) => {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-accent" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-warning/15 text-warning';
      case 'moderator':
        return 'bg-accent/20 text-accent';
      default:
        return 'bg-muted text-foreground';
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
    <Card className="p-4 transition-shadow hover:shadow-md">
      <Link href={`/user/${member.username}`}>
        <div className="flex items-start space-x-3">
          <Avatar fallback={member.username} alt={member.username} size="md" />

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center space-x-2">
              <span className="font-medium transition-colors hover:text-primary">
                @{member.username}
              </span>
              <Badge variant="secondary" className={`text-xs ${getRoleColor(member.role)}`}>
                <div className="flex items-center space-x-1">
                  {getRoleIcon(member.role)}
                  <span className="capitalize">{member.role}</span>
                </div>
              </Badge>
            </div>

            <p className="mb-2 text-sm text-muted-foreground">{getRoleDescription(member.role)}</p>

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
