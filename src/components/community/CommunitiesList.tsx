'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCommunities } from '@/lib/react-query/queries/useCommunity';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { Avatar } from '@/components/core/Avatar';
import { JoinButton } from './JoinButton';
import {
  Users,
  FileText,
  Calendar,
  Search,
  Globe,
  Lock,
  Mail,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Community, SPORT_CATEGORIES, CommunityType, CommunityFilters } from '@/types';
import { cn } from '@/lib/utils/client';

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
          <div key={i} className="animate-pulse rounded-lg border bg-card p-4 sm:p-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-700 sm:h-16 sm:w-16"></div>
              <div className="flex-1">
                <div className="mb-2 h-6 w-1/3 rounded bg-gray-300 dark:bg-gray-700"></div>
                <div className="mb-2 h-4 w-2/3 rounded bg-gray-300 dark:bg-gray-700"></div>
                <div className="h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-700"></div>
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
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Error Loading Communities
        </h3>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          {error instanceof Error
            ? error.message
            : 'Failed to load communities. Please try again later.'}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <input
                type="text"
                placeholder="Search communities..."
                value={filters.search || ''}
                onChange={handleSearchChange}
                className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              variant={showAdvancedFilters ? 'default' : 'outline'}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
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
            <Card className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Advanced Filters</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Sport Category Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium">Sport Category</label>
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
                <label className="mb-2 block text-sm font-medium">Community Type</label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.type === 'public' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTypeChange('public')}
                  >
                    <Globe className="mr-1 h-4 w-4" />
                    Public
                  </Button>
                  <Button
                    variant={filters.type === 'private' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTypeChange('private')}
                  >
                    <Lock className="mr-1 h-4 w-4" />
                    Private
                  </Button>
                  <Button
                    variant={filters.type === 'invite-only' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTypeChange('invite-only')}
                  >
                    <Mail className="mr-1 h-4 w-4" />
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
          communities.map((community) => <CommunityCard key={community.id} community={community} />)
        ) : (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">🏘️</div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              No Communities Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filters.search
                ? `No communities match "${filters.search}"`
                : hasActiveFilters
                  ? 'No communities match your filters. Try adjusting them.'
                  : 'No communities available yet. Be the first to create one!'}
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {data?.hasMore && (
        <div className="pt-4 text-center">
          <Button
            variant="outline"
            onClick={() => {
              setFilters((prev) => ({ ...prev, limit: (prev.limit || 20) + 20 }));
            }}
          >
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
  const typeIcon =
    community.type === 'public' ? (
      <Globe className="h-4 w-4" />
    ) : community.type === 'private' ? (
      <Lock className="h-4 w-4" />
    ) : (
      <Mail className="h-4 w-4" />
    );

  const sportCategory = SPORT_CATEGORIES.find((s) => s.id === community.sportCategory);

  return (
    <Card className="p-4 transition-shadow hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Link
          href={`/community/${community.slug || community.id}`}
          className="flex flex-1 items-start space-x-3 sm:space-x-4"
        >
          <Avatar
            src={community.avatar}
            fallback={community.name}
            alt={community.name}
            size="lg"
            className="h-12 w-12 sm:h-16 sm:w-16"
          />

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold transition-colors hover:text-primary sm:text-xl">
                {community.name}
              </h3>
              <span
                className={cn(
                  'text-muted-foreground',
                  community.type === 'private' && 'text-yellow-600',
                  community.type === 'invite-only' && 'text-purple-600'
                )}
              >
                {typeIcon}
              </span>
              {community.isVerified && (
                <span className="text-blue-500" title="Verified Community">
                  ✓
                </span>
              )}
            </div>

            {sportCategory && (
              <div className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
                <span>{sportCategory.icon}</span>
                <span>{sportCategory.name}</span>
              </div>
            )}

            <p className="mb-4 line-clamp-2 text-muted-foreground">{community.about}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                <span>Created {new Date(community.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </Link>

        <div className="sm:ml-4">
          <JoinButton community={community} size="sm" />
        </div>
      </div>
    </Card>
  );
};
