'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  MapPin,
  Calendar,
  Link as LinkIcon,
  Edit,
  Settings,
  RefreshCw,
  AlertCircle,
  Loader2,
  Star,
} from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { PostCard } from '@/components/posts/PostCard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useModal } from '@/components/modals/ModalProvider';
// getUserPosts is now accessed via API route
import { SportsblockPost } from '@/lib/shared/types';
import { logger } from '@/lib/logger';
import { DraftsContent } from '@/components/profile/DraftsContent';
import { RepliesContent } from '@/components/profile/RepliesContent';
import { BookmarksContent } from '@/components/profile/BookmarksContent';
import { FollowersContent } from '@/components/profile/FollowersContent';
import { FollowingContent } from '@/components/profile/FollowingContent';
import { RoleBadge } from '@/components/user/RoleBadge';

/**
 * Get the like/vote count from a post.
 * Handles both soft posts (likeCount) and Hive posts (net_votes).
 */
function getPostLikeCount(post: SportsblockPost): number {
  const likeCount = (post as { likeCount?: number }).likeCount;
  return likeCount ?? post.net_votes ?? 0;
}

/**
 * Get the view count from a post.
 * Only soft posts have view counts, Hive posts don't track views.
 */
function getPostViewCount(post: SportsblockPost): number {
  return (post as { viewCount?: number }).viewCount ?? 0;
}

export default function ProfilePage() {
  const { user, authType, refreshHiveAccount, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { openModal } = useModal();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<SportsblockPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'posts' | 'drafts' | 'replies' | 'bookmarks' | 'following' | 'followers'
  >('posts');

  // Redirect if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  const loadUserPosts = React.useCallback(async () => {
    if (!user?.username) return;

    setIsLoadingPosts(true);
    setPostsError(null);

    try {
      // Use unified endpoint for all users - it handles both Hive and soft posts
      const endpoint =
        authType === 'hive'
          ? `/api/unified/posts?username=${encodeURIComponent(user.username)}&limit=20&includeHive=true&includeSoft=true`
          : `/api/unified/posts?username=${encodeURIComponent(user.username)}&limit=20&includeSoft=true&includeHive=false`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }
      const result = await response.json();
      // Map unified posts to SportsblockPost format for PostCard compatibility
      const posts = result.success
        ? (result.posts || []).map((p: Record<string, unknown>) => ({
            ...p,
            author: p.author,
            permlink: p.permlink,
            title: p.title,
            body: p.body,
            created: p.created,
            isSportsblockPost: p.isHivePost || false,
            postType: p.isHivePost ? 'sportsblock' : 'soft',
            // Map fields for PostCard compatibility
            net_votes: p.netVotes || 0,
            children: p.children || 0,
            pending_payout_value: p.pendingPayout || '0.000 HBD',
            active_votes: p.activeVotes || [],
            tags: p.tags || [],
            sport_category: p.sportCategory,
            img_url: p.featuredImage,
            // Soft post specific
            likeCount: p.likeCount || 0,
            viewCount: p.viewCount || 0,
            _isSoftPost: p.isSoftPost || false,
            _softPostId: p.softPostId,
          }))
        : [];
      setUserPosts(posts);
    } catch (error) {
      logger.error('Error loading user posts', 'ProfilePage', error);
      setPostsError('Failed to load posts. Please try again.');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [user?.username, authType]);

  const handleRefreshProfile = async () => {
    if (authType !== 'hive') return;

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      await refreshHiveAccount();
    } catch {
      setRefreshError('Failed to refresh profile data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load user posts when component mounts
  useEffect(() => {
    if (user?.username) {
      loadUserPosts();
    }
  }, [user?.username, loadUserPosts]);

  // Show skeleton while auth is loading (handled by loading.tsx for initial load)
  if (isAuthLoading) {
    return null; // Let loading.tsx handle it
  }

  // User not authenticated - will redirect
  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
        {/* Profile Header */}
        <div className="overflow-hidden rounded-lg border bg-card">
          {/* Cover Photo */}
          <div className="relative h-32 bg-gradient-to-r from-primary via-bright-cobalt to-accent sm:h-48">
            {user.hiveProfile?.coverImage && (
              <Image
                src={user.hiveProfile.coverImage}
                alt="Cover"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                className="object-cover"
              />
            )}
          </div>

          {/* Profile Info */}
          <div className="px-4 py-4 sm:p-6">
            {/* Avatar + Name row */}
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="relative -mt-12 flex-shrink-0 sm:-mt-16">
                <Avatar
                  src={user.avatar}
                  alt={user.displayName || user.username}
                  fallback={user.username}
                  size="lg"
                  className="h-20 w-20 border-4 border-background sm:h-32 sm:w-32"
                />
              </div>

              <div className="min-w-0 flex-1 pt-1 sm:pt-4">
                <div className="flex items-center justify-between">
                  <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2 sm:mb-2">
                    <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
                      {user.displayName || user.username}
                    </h1>
                    <RoleBadge username={user.username} size="md" />
                    {authType === 'hive' && user.reputationFormatted && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 shadow-md shadow-amber-500/25">
                        <Star className="h-3.5 w-3.5 text-white" />
                        <span className="text-xs font-semibold text-white">
                          {user.reputationFormatted}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons — desktop only */}
                  <div className="hidden flex-shrink-0 items-center space-x-2 sm:flex">
                    {authType === 'hive' && (
                      <Button
                        variant="outline"
                        onClick={handleRefreshProfile}
                        disabled={isRefreshing}
                        className="flex items-center space-x-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex items-center space-x-2"
                      onClick={() => openModal('editProfile')}
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </Button>
                    <Button variant="outline" size="icon" aria-label="Profile settings">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mb-2 text-sm text-muted-foreground sm:text-lg">@{user.username}</p>
              </div>
            </div>

            {/* Action buttons — mobile only */}
            <div className="mt-3 flex items-center space-x-2 sm:hidden">
              {authType === 'hive' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshProfile}
                  disabled={isRefreshing}
                  className="flex items-center space-x-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-xs">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-1.5"
                onClick={() => openModal('editProfile')}
              >
                <Edit className="h-3.5 w-3.5" />
                <span className="text-xs">Edit Profile</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Profile settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Error Display */}
            {refreshError && (
              <div className="mt-3 flex items-start space-x-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm text-destructive">{refreshError}</p>
                  <button
                    onClick={() => setRefreshError(null)}
                    className="mt-1 text-xs text-destructive underline hover:text-destructive/80"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Profile Details */}
            <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
              {user.hiveProfile?.location && (
                <div className="flex items-center space-x-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{user.hiveProfile.location}</span>
                </div>
              )}

              <div className="flex items-center space-x-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  Joined{' '}
                  {user.createdAt instanceof Date
                    ? user.createdAt.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Unknown'}
                </span>
              </div>

              {user.hiveProfile?.website && (
                <div className="flex items-center space-x-3 text-sm">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={user.hiveProfile.website}
                    className="text-primary transition-colors hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {user.hiveProfile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            {/* Bio Section */}
            <div className="mt-4 sm:mt-6">
              <p className="max-w-2xl text-sm leading-relaxed text-foreground sm:text-base">
                {user.bio || user.hiveProfile?.about || 'No bio available.'}
              </p>
            </div>

            {/* Stats Section */}
            <div className="mt-4 flex items-center space-x-4 border-t border-border pt-3 sm:mt-6 sm:space-x-6 sm:pt-4">
              {authType === 'hive' ? (
                <>
                  <button
                    onClick={() => setActiveTab('following')}
                    className="cursor-pointer text-center transition-opacity hover:opacity-70"
                  >
                    <div className="text-lg font-bold text-foreground sm:text-2xl">
                      {isRefreshing ? '...' : (user.hiveStats?.following || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-sm">Following</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('followers')}
                    className="cursor-pointer text-center transition-opacity hover:opacity-70"
                  >
                    <div className="text-lg font-bold text-foreground sm:text-2xl">
                      {isRefreshing ? '...' : (user.hiveStats?.followers || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-sm">Followers</div>
                  </button>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground sm:text-2xl">
                      {isRefreshing ? '...' : (user.hiveStats?.postCount || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-sm">Posts</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground sm:text-2xl">
                      {userPosts.length}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-sm">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground sm:text-2xl">
                      {userPosts.reduce((sum, p) => sum + getPostLikeCount(p), 0)}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-sm">Likes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground sm:text-2xl">
                      {userPosts.reduce((sum, p) => sum + getPostViewCount(p), 0)}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-sm">Views</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center overflow-x-auto border-b border-border px-3 sm:px-6">
            {(authType === 'hive'
              ? (['posts', 'drafts', 'replies', 'bookmarks', 'following', 'followers'] as const)
              : (['posts', 'drafts', 'replies', 'bookmarks'] as const)
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={
                  activeTab === tab
                    ? 'whitespace-nowrap border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary transition-colors sm:px-4 sm:py-3 sm:text-base'
                    : 'whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:px-4 sm:py-3 sm:text-base'
                }
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-6">
            {activeTab === 'posts' && (
              <>
                {isLoadingPosts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading posts...</span>
                  </div>
                ) : postsError ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
                    <h3 className="mb-2 text-lg font-semibold">Error loading posts</h3>
                    <p className="mb-4 text-muted-foreground">{postsError}</p>
                    <Button onClick={loadUserPosts}>Try Again</Button>
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="space-y-6">
                    {userPosts.map((post) => (
                      <PostCard key={`${post.author}-${post.permlink}`} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="mb-4 text-6xl">📝</div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground">No posts yet</h3>
                    <p className="mb-6 text-muted-foreground">
                      Start sharing your sports insights and connect with the community!
                    </p>
                    <Button onClick={() => router.push('/publish')}>
                      <Edit className="mr-2 h-4 w-4" />
                      Create Your First Post
                    </Button>
                  </div>
                )}

                {userPosts.length > 0 && (
                  <div className="mt-6 text-center">
                    <Button variant="outline" onClick={loadUserPosts}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Posts
                    </Button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'drafts' && <DraftsContent />}
            {activeTab === 'replies' && <RepliesContent />}
            {activeTab === 'bookmarks' && <BookmarksContent />}
            {activeTab === 'following' && <FollowingContent />}
            {activeTab === 'followers' && <FollowersContent />}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
