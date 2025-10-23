"use client";

import React from "react";
import Link from "next/link";
import { useCommunities } from "@/lib/react-query/queries/useCommunity";
import { useCommunityStore } from "@/stores/communityStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Users, FileText, Calendar, Search } from "lucide-react";
import { Community } from "@/types";

interface CommunitiesListProps {
  className?: string;
}

export const CommunitiesList: React.FC<CommunitiesListProps> = ({ className }) => {
  const { filters, setFilters } = useCommunityStore();
  const { data, isLoading, error } = useCommunities(filters);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };

  const handleSortChange = (sort: 'subscribers' | 'posts' | 'created' | 'name') => {
    setFilters({ sort });
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
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
          Error Loading Communities
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Failed to load communities. Please try again later.
        </p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  const communities = data?.communities || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search communities..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.sort === 'subscribers' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('subscribers')}
          >
            Most Subscribers
          </Button>
          <Button
            variant={filters.sort === 'posts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('posts')}
          >
            Most Posts
          </Button>
          <Button
            variant={filters.sort === 'created' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('created')}
          >
            Newest
          </Button>
          <Button
            variant={filters.sort === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('name')}
          >
            Name A-Z
          </Button>
        </div>
      </div>

      {/* Communities List */}
      <div className="space-y-4">
        {communities.length > 0 ? (
          communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏘️</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Communities Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filters.search 
                ? `No communities match "${filters.search}"`
                : "No communities available at the moment."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface CommunityCardProps {
  community: Community;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community }) => {
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <Link href={`/community/${community.id}`}>
        <div className="flex items-start space-x-4">
          <Avatar
            src={community.avatar}
            fallback={community.name}
            alt={community.title}
            size="lg"
            className="w-16 h-16"
          />
          
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold hover:text-primary transition-colors">
              {community.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              @{community.name}
            </p>
            <p className="text-muted-foreground mb-4 line-clamp-2">
              {community.about}
            </p>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{community.subscribers.toLocaleString()} subscribers</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>{community.posts.toLocaleString()} posts</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(community.created).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
};
