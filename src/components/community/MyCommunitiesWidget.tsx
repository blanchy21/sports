'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCommunities } from '@/lib/react-query/queries/useCommunity';
import { Avatar } from '@/components/core/Avatar';
import { ChevronRight, Users2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/client';

interface MyCommunitiesWidgetProps {
  className?: string;
  maxItems?: number;
}

export const MyCommunitiesWidget: React.FC<MyCommunitiesWidgetProps> = ({
  className,
  maxItems = 5,
}) => {
  const { user } = useAuth();
  const { data: communities, isLoading } = useUserCommunities(user?.id || '');

  // Don't render if not authenticated
  if (!user) return null;

  const displayCommunities = communities?.slice(0, maxItems) || [];
  const hasMore = (communities?.length || 0) > maxItems;

  return (
    <div className={cn('border-t px-4 py-3', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">My Communities</h3>
        <Link
          href="/communities"
          className="flex items-center gap-0.5 text-xs text-primary hover:underline"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : displayCommunities.length > 0 ? (
        <div className="space-y-1">
          {displayCommunities.map((community) => (
            <Link
              key={community.id}
              href={`/community/${community.slug || community.id}`}
              className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
            >
              <Avatar
                src={community.avatar}
                fallback={community.name}
                alt={community.name}
                size="sm"
                className="h-8 w-8"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                  {community.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {community.memberCount?.toLocaleString() || 0} members
                </div>
              </div>
            </Link>
          ))}

          {hasMore && (
            <Link
              href="/communities"
              className="flex items-center gap-2 p-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <span>+{(communities?.length || 0) - maxItems} more</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="py-4 text-center">
          <Users2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="mb-2 text-xs text-muted-foreground">No communities joined yet</p>
          <Link href="/communities" className="text-xs text-primary hover:underline">
            Discover communities
          </Link>
        </div>
      )}
    </div>
  );
};
