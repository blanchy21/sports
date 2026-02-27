'use client';

import React from 'react';
import Link from 'next/link';
import { useCommunityMembers } from '@/lib/react-query/queries/useCommunity';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { Avatar } from '@/components/core/Avatar';
import { Badge } from '@/components/core/Badge';
import { Users, Crown, Shield, User } from 'lucide-react';
import { CommunityMember } from '@/types';

interface CommunityMembersProps {
  communityId: string;
  className?: string;
}

export const CommunityMembers: React.FC<CommunityMembersProps> = ({ communityId, className }) => {
  const { data: members, isLoading, error } = useCommunityMembers(communityId, { limit: 50 });

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-muted"></div>
              <div className="flex-1">
                <div className="mb-2 h-4 w-1/4 rounded bg-muted"></div>
                <div className="h-3 w-1/3 rounded bg-muted"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`py-12 text-center ${className}`}>
        <div className="mb-4 text-6xl">⚠️</div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">Error Loading Members</h3>
        <p className="mb-6 text-muted-foreground">
          Failed to load community members. Please try again later.
        </p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  const membersList = members || [];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center space-x-2 text-xl font-semibold">
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
        <div className="py-12 text-center">
          <div className="mb-4 text-6xl">👥</div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">No Members Yet</h3>
          <p className="text-muted-foreground">This community doesn&apos;t have any members yet.</p>
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
    <Card className="p-4 transition-shadow hover:shadow-md">
      <Link href={`/user/${member.username}`}>
        <div className="flex items-center space-x-3">
          <Avatar fallback={member.username} alt={member.username} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
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
      return 'bg-warning/15 text-warning';
    case 'moderator':
      return 'bg-accent/20 text-accent';
    default:
      return 'bg-muted text-foreground';
  }
};
