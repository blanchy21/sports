"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCommunities } from "@/lib/react-query/queries/useCommunity";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronRight, Users2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className={cn("px-4 py-3 border-t", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          My Communities
        </h3>
        <Link
          href="/communities"
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
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
              className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors group"
            >
              <Avatar
                src={community.avatar}
                fallback={community.name}
                alt={community.name}
                size="sm"
                className="w-8 h-8"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
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
              className="flex items-center gap-2 p-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span>+{(communities?.length || 0) - maxItems} more</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <Users2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground mb-2">
            No communities joined yet
          </p>
          <Link
            href="/communities"
            className="text-xs text-primary hover:underline"
          >
            Discover communities
          </Link>
        </div>
      )}
    </div>
  );
};
