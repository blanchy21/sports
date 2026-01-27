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
  Zap,
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
      console.error('Error loading user posts:', error);
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
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Profile Header */}
        <div className="overflow-hidden rounded-lg border bg-card">
          {/* Cover Photo */}
          <div className="relative h-48 bg-gradient-to-r from-primary via-bright-cobalt to-accent">
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
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {/* Avatar */}
                <div className="relative -mt-16">
                  <Avatar
                    src={user.avatar}
                    alt={user.displayName || user.username}
                    fallback={user.username}
                    size="lg"
                    className="h-32 w-32 border-4 border-background"
                  />
                </div>

                <div className="mt-4 flex-1">
                  <div className="mb-2 flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-foreground">
                      {user.displayName || user.username}
                    </h1>
                    {authType === 'hive' && (
                      <div className="flex items-center space-x-2">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-2.5 py-1 shadow-md shadow-red-500/25">
                          <Zap className="h-3.5 w-3.5 text-white" />
                          <span className="text-xs font-semibold text-white">Hive</span>
                        </div>
                        {user.reputationFormatted && (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 shadow-md shadow-amber-500/25">
                            <Star className="h-3.5 w-3.5 text-white" />
                            <span className="text-xs font-semibold text-white">
                              {user.reputationFormatted}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mb-2 text-lg text-muted-foreground">@{user.username}</p>

                  {/* Error Display */}
                  {refreshError && (
                    <div className="mt-3 flex items-start space-x-2 rounded-lg border border-red-200 bg-red-50 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-sm text-red-800">{refreshError}</p>
                        <button
                          onClick={() => setRefreshError(null)}
                          className="mt-1 text-xs text-red-600 underline hover:text-red-800"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Profile Details */}
                  <div className="mt-4 space-y-3">
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
                  <div className="mt-6">
                    <p className="max-w-2xl text-base leading-relaxed text-foreground">
                      {user.bio || user.hiveProfile?.about || 'No bio available.'}
                    </p>
                  </div>

                  {/* Stats Section */}
                  <div className="mt-6 flex items-center space-x-6 border-t border-border pt-4">
                    {authType === 'hive' ? (
                      <>
                        <button
                          onClick={() => router.push('/following')}
                          className="cursor-pointer text-center transition-opacity hover:opacity-70"
                        >
                          <div className="text-2xl font-bold text-foreground">
                            {isRefreshing
                              ? '...'
                              : (user.hiveStats?.following || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Following</div>
                        </button>
                        <button
                          onClick={() => router.push('/followers')}
                          className="cursor-pointer text-center transition-opacity hover:opacity-70"
                        >
                          <div className="text-2xl font-bold text-foreground">
                            {isRefreshing
                              ? '...'
                              : (user.hiveStats?.followers || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Followers</div>
                        </button>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {isRefreshing
                              ? '...'
                              : (user.hiveStats?.postCount || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Posts</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {userPosts.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Posts</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {userPosts.reduce((sum, p) => sum + getPostLikeCount(p), 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Likes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {userPosts.reduce((sum, p) => sum + getPostViewCount(p), 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Views</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
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
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center border-b border-border px-6">
            <button className="border-b-2 border-primary px-4 py-3 font-medium text-primary transition-colors">
              Posts
            </button>
            <button className="px-4 py-3 text-muted-foreground transition-colors hover:text-foreground">
              About
            </button>
            <button className="px-4 py-3 text-muted-foreground transition-colors hover:text-foreground">
              Media
            </button>
            <button className="px-4 py-3 text-muted-foreground transition-colors hover:text-foreground">
              Stats
            </button>
          </div>

          {/* Posts Content */}
          <div className="p-6">
            {isLoadingPosts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading posts...</span>
              </div>
            ) : postsError ? (
              <div className="py-12 text-center">
                <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
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
                <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  No posts yet
                </h3>
                <p className="mb-6 text-gray-500 dark:text-gray-400">
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
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
