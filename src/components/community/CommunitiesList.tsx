"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCommunities } from "@/lib/react-query/queries/useCommunity";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { JoinButton } from "./JoinButton";
import { 
  Users, 
  FileText, 
  Calendar, 
  Search, 
  Globe, 
  Lock, 
  Mail,
  SlidersHorizontal,
  X
} from "lucide-react";
import { Community, SPORT_CATEGORIES, CommunityType, CommunityFilters } from "@/types";
import { cn } from "@/lib/utils";

interface CommunitiesListProps {
  className?: string;
  showFilters?: boolean;
  initialFilters?: CommunityFilters;
}

const SORT_OPTIONS = [
  { value: 'memberCount', label: 'Most Members' },
  { value: 'postCount', label: 'Most Posts' },
  { value: 'createdAt', label: 'Newest' },
  { value: 'name', label: 'Name A-Z' },
] as const;

export const CommunitiesList: React.FC<CommunitiesListProps> = ({ 
  className,
  showFilters = true,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<CommunityFilters>({
    sort: 'memberCount',
    ...initialFilters,
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { data, isLoading, error, refetch } = useCommunities(filters);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  const handleSortChange = (sort: CommunityFilters['sort']) => {
    setFilters((prev) => ({ ...prev, sort }));
  };

  const handleSportCategoryChange = (sportCategory: string) => {
    setFilters((prev) => ({
      ...prev,
      sportCategory: sportCategory === prev.sportCategory ? undefined : sportCategory,
    }));
  };

  const handleTypeChange = (type: CommunityType) => {
    setFilters((prev) => ({
      ...prev,
      type: type === prev.type ? undefined : type,
    }));
  };

  const clearFilters = () => {
    setFilters({ sort: 'memberCount' });
  };

  const hasActiveFilters = filters.search || filters.sportCategory || filters.type;

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
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
          {error instanceof Error ? error.message : 'Failed to load communities. Please try again later.'}
        </p>
        <Button onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  const communities = data?.communities || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filters */}
      {showFilters && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search communities..."
                value={filters.search || ''}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Sort Buttons */}
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={filters.sort === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSortChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Advanced Filters</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Sport Category Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Sport Category</label>
                <div className="flex flex-wrap gap-2">
                  {SPORT_CATEGORIES.slice(0, 10).map((sport) => (
                    <Button
                      key={sport.id}
                      variant={filters.sportCategory === sport.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSportCategoryChange(sport.id)}
                    >
                      {sport.icon} {sport.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Community Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Community Type</label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.type === 'public' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTypeChange('public')}
                  >
                    <Globe className="h-4 w-4 mr-1" />
                    Public
                  </Button>
                  <Button
                    variant={filters.type === 'private' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTypeChange('private')}
                  >
                    <Lock className="h-4 w-4 mr-1" />
                    Private
                  </Button>
                  <Button
                    variant={filters.type === 'invite-only' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTypeChange('invite-only')}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Invite Only
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

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
                : hasActiveFilters
                  ? "No communities match your filters. Try adjusting them."
                  : "No communities available yet. Be the first to create one!"
              }
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {data?.hasMore && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={() => {
            setFilters((prev) => ({ ...prev, limit: (prev.limit || 20) + 20 }));
          }}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

interface CommunityCardProps {
  community: Community;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community }) => {
  const typeIcon = community.type === 'public' 
    ? <Globe className="h-4 w-4" /> 
    : community.type === 'private' 
      ? <Lock className="h-4 w-4" />
      : <Mail className="h-4 w-4" />;

  const sportCategory = SPORT_CATEGORIES.find((s) => s.id === community.sportCategory);

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <Link href={`/community/${community.slug || community.id}`} className="flex items-start space-x-4 flex-1">
          <Avatar
            src={community.avatar}
            fallback={community.name}
            alt={community.name}
            size="lg"
            className="w-16 h-16"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-semibold hover:text-primary transition-colors">
                {community.name}
              </h3>
              <span className={cn(
                "text-muted-foreground",
                community.type === 'private' && "text-yellow-600",
                community.type === 'invite-only' && "text-purple-600"
              )}>
                {typeIcon}
              </span>
              {community.isVerified && (
                <span className="text-blue-500" title="Verified Community">✓</span>
              )}
            </div>

            {sportCategory && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <span>{sportCategory.icon}</span>
                <span>{sportCategory.name}</span>
              </div>
            )}

            <p className="text-muted-foreground mb-4 line-clamp-2">
              {community.about}
            </p>
            
            <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{community.memberCount?.toLocaleString() || 0} members</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>{community.postCount?.toLocaleString() || 0} posts</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>
                  Created {new Date(community.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </Link>

        <div className="ml-4">
          <JoinButton community={community} size="sm" />
        </div>
      </div>
    </Card>
  );
};
