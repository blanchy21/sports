'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { MapPin, Calendar, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { PostCard } from '@/components/posts/PostCard';
// getUserPosts is now accessed via API route
import { SportsblockPost } from '@/lib/shared/types';
import { useUserProfile, useSoftUserProfile } from '@/lib/react-query/queries/useUserProfile';
import {
  useUserFollowerCount,
  useUserFollowingCount,
} from '@/lib/react-query/queries/useUserProfile';
import { useModal } from '@/components/modals/ModalProvider';
import { usePremiumTier } from '@/lib/premium/hooks';
import { PremiumBadge } from '@/components/medals';
import { FollowButton } from '@/components/user/FollowButton';
import { LastSeenIndicator } from '@/components/user/LastSeenIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export default function UserProfileClient() {
  const params = useParams();
  const router = useRouter();
  const { openModal } = useModal();
  const { user: currentUser, authType } = useAuth();
  const username = params.username as string;

  // Fetch both profiles in parallel to avoid waterfall
  const {
    data: hiveProfile,
    isLoading: isHiveLoading,
    error: hiveError,
  } = useUserProfile(username);

  // Soft user follow stats
  const [softFollowerCount, setSoftFollowerCount] = useState(0);
  const [softFollowingCount, setSoftFollowingCount] = useState(0);

  // Fetch soft profile in parallel (not gated on Hive completing)
  const { data: softProfile, isLoading: isSoftLoading } = useSoftUserProfile(username);

  // Determine which profile to use (prefer Hive)
  const isProfileLoading = isHiveLoading || isSoftLoading;
  const profile = hiveProfile || softProfile;
  const isSoftUser = !hiveProfile && !!softProfile;
  const profileError = !hiveProfile && !softProfile && !isProfileLoading ? hiveError : null;

  // Only fetch follower/following counts for Hive users
  const { data: followerCount } = useUserFollowerCount(hiveProfile ? username : '');
  const { data: followingCount } = useUserFollowingCount(hiveProfile ? username : '');
  const { tier: premiumTier } = usePremiumTier(hiveProfile ? username : '');

  const [userPosts, setUserPosts] = useState<SportsblockPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const retryLoadPosts = () => setRetryKey((k) => k + 1);

  // Fetch soft user follower/following counts
  useEffect(() => {
    if (!isSoftUser || !softProfile) return;

    const fetchSoftFollowStats = async () => {
      try {
        const response = await fetch('/api/soft/follows', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: (softProfile as { id?: string }).id }),
        });

        if (response.ok) {
          const data = await response.json();
          setSoftFollowerCount(data.stats.followerCount);
          setSoftFollowingCount(data.stats.followingCount);
        }
      } catch {
        // Silently fail
      }
    };

    fetchSoftFollowStats();
  }, [isSoftUser, softProfile, currentUser?.id, authType]);

  useEffect(() => {
    if (!username || isProfileLoading) return;

    const abortController = new AbortController();

    const loadUserPosts = async () => {
      setIsLoadingPosts(true);
      setPostsError(null);

      try {
        // Use unified endpoint - it handles both Hive and soft users
        const endpoint = isSoftUser
          ? `/api/unified/posts?username=${encodeURIComponent(username)}&limit=20&includeSoft=true&includeHive=false`
          : `/api/unified/posts?username=${encodeURIComponent(username)}&limit=20&includeHive=true&includeSoft=true`;

        const response = await fetch(endpoint, { signal: abortController.signal });
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
              net_votes: p.netVotes || 0,
              children: p.children || 0,
              pending_payout_value: p.pendingPayout || '0.000 HBD',
              active_votes: p.activeVotes || [],
              tags: p.tags || [],
              sport_category: p.sportCategory,
              img_url: p.featuredImage,
              likeCount: p.likeCount || 0,
              viewCount: p.viewCount || 0,
              _isSoftPost: p.isSoftPost || false,
              _softPostId: p.softPostId,
            }))
          : [];
        setUserPosts(posts);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        logger.error('Error loading user posts', 'UserProfilePage', error);
        setPostsError('Failed to load posts. Please try again.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingPosts(false);
        }
      }
    };

    loadUserPosts();

    return () => {
      abortController.abort();
    };
  }, [username, retryKey, isSoftUser, isProfileLoading]);

  if (isProfileLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 rounded-lg bg-gray-200 sm:h-48"></div>
            <div className="flex items-center space-x-4">
              <div className="h-24 w-24 rounded-full bg-gray-200 sm:h-32 sm:w-32"></div>
              <div className="flex-1 space-y-2">
                <div className="h-8 w-1/3 rounded bg-gray-200"></div>
                <div className="h-4 w-1/4 rounded bg-gray-200"></div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (profileError || !profile) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl p-6">
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">⚠️</div>
            <h3 className="mb-2 text-xl font-semibold">User Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The user profile you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back Button */}
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Profile Header */}
        <div className="bg-card overflow-hidden rounded-lg border">
          {/* Cover Photo */}
          <div className="from-primary via-bright-cobalt to-accent relative h-32 bg-linear-to-r sm:h-48">
            {!isSoftUser &&
              (profile as { profile?: { coverImage?: string } }).profile?.coverImage && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={(profile as { profile?: { coverImage?: string } }).profile!.coverImage!}
                  alt="Cover"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
          </div>

          {/* Profile Info */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-4">
              {/* Avatar */}
              <div className="relative -mt-12 sm:-mt-16">
                <Avatar
                  src={
                    isSoftUser
                      ? (profile as { avatarUrl?: string }).avatarUrl
                      : (profile as { profile?: { profileImage?: string } }).profile?.profileImage
                  }
                  alt={
                    isSoftUser
                      ? (profile as { displayName?: string }).displayName || username
                      : (profile as { profile?: { name?: string } }).profile?.name || username
                  }
                  fallback={username}
                  size="lg"
                  className="border-background h-24 w-24 border-4 sm:h-32 sm:w-32"
                />
              </div>

              <div className="mt-4 flex-1 text-center sm:text-left">
                <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
                  <h1 className="text-foreground text-2xl font-bold sm:text-3xl">
                    {isSoftUser
                      ? (profile as { displayName?: string }).displayName || username
                      : (profile as { profile?: { name?: string } }).profile?.name || username}
                  </h1>
                  {!isSoftUser && premiumTier && <PremiumBadge tier={premiumTier} size="md" />}
                  {!isSoftUser &&
                    (profile as { reputationFormatted?: string }).reputationFormatted && (
                      <div className="bg-accent/20 dark:bg-accent/20 rounded-full px-2 py-1">
                        <span className="text-accent dark:text-accent text-xs font-medium">
                          Rep: {(profile as { reputationFormatted?: string }).reputationFormatted}
                        </span>
                      </div>
                    )}
                  {isSoftUser && (
                    <div className="rounded-full bg-blue-100 px-2 py-1 dark:bg-blue-900/30">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Sportsblock User
                      </span>
                    </div>
                  )}
                  {/* Follow Button for soft users */}
                  {isSoftUser &&
                    softProfile &&
                    currentUser?.id !== (softProfile as { id?: string }).id && (
                      <FollowButton
                        targetUserId={(softProfile as { id?: string }).id || ''}
                        targetUsername={username}
                        initialFollowerCount={softFollowerCount}
                        onFollowChange={(_, newCount) => setSoftFollowerCount(newCount)}
                      />
                    )}
                </div>
                <p className="text-muted-foreground mb-2 text-base sm:text-lg">@{username}</p>

                {/* Profile Details */}
                <div className="mt-4 space-y-3">
                  {!isSoftUser &&
                    (profile as { profile?: { location?: string } }).profile?.location && (
                      <div className="flex items-center space-x-3 text-sm">
                        <MapPin className="text-muted-foreground h-4 w-4" />
                        <span className="text-foreground">
                          {(profile as { profile?: { location?: string } }).profile!.location}
                        </span>
                      </div>
                    )}

                  <div className="flex items-center space-x-3 text-sm">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span className="text-foreground">
                      Joined{' '}
                      {new Date(profile.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Last seen indicator for soft users */}
                  {isSoftUser && (softProfile as { lastActiveAt?: string }).lastActiveAt && (
                    <LastSeenIndicator
                      lastActiveAt={(softProfile as { lastActiveAt?: string }).lastActiveAt}
                    />
                  )}

                  {!isSoftUser &&
                    (profile as { profile?: { website?: string } }).profile?.website && (
                      <div className="flex items-center space-x-3 text-sm">
                        <LinkIcon className="text-muted-foreground h-4 w-4" />
                        <a
                          href={(profile as { profile?: { website?: string } }).profile!.website!}
                          className="text-primary transition-colors hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {(
                            profile as { profile?: { website?: string } }
                          ).profile!.website!.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                </div>

                {/* Bio Section */}
                {(isSoftUser
                  ? (profile as { bio?: string }).bio
                  : (profile as { profile?: { about?: string } }).profile?.about) && (
                  <div className="mt-6">
                    <p className="text-foreground max-w-2xl text-base leading-relaxed">
                      {isSoftUser
                        ? (profile as { bio?: string }).bio
                        : (profile as { profile?: { about?: string } }).profile?.about}
                    </p>
                  </div>
                )}

                {/* Stats Section */}
                <div className="border-border mt-6 flex items-center justify-center gap-4 border-t pt-4 sm:justify-start sm:gap-6">
                  {!isSoftUser ? (
                    <>
                      <div
                        className="cursor-pointer text-center transition-opacity hover:opacity-70"
                        onClick={() => openModal('followersList', { username, type: 'following' })}
                      >
                        <div className="text-foreground text-2xl font-bold">
                          {followingCount || 0}
                        </div>
                        <div className="text-muted-foreground text-sm">Following</div>
                      </div>
                      <div
                        className="cursor-pointer text-center transition-opacity hover:opacity-70"
                        onClick={() => openModal('followersList', { username, type: 'followers' })}
                      >
                        <div className="text-foreground text-2xl font-bold">
                          {followerCount || 0}
                        </div>
                        <div className="text-muted-foreground text-sm">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-foreground text-2xl font-bold">{userPosts.length}</div>
                        <div className="text-muted-foreground text-sm">Posts</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="cursor-pointer text-center transition-opacity hover:opacity-70"
                        onClick={() =>
                          openModal('softFollowersList', {
                            userId: (softProfile as { id?: string }).id,
                            username,
                            type: 'following',
                          })
                        }
                      >
                        <div className="text-foreground text-2xl font-bold">
                          {softFollowingCount}
                        </div>
                        <div className="text-muted-foreground text-sm">Following</div>
                      </div>
                      <div
                        className="cursor-pointer text-center transition-opacity hover:opacity-70"
                        onClick={() =>
                          openModal('softFollowersList', {
                            userId: (softProfile as { id?: string }).id,
                            username,
                            type: 'followers',
                          })
                        }
                      >
                        <div className="text-foreground text-2xl font-bold">
                          {softFollowerCount}
                        </div>
                        <div className="text-muted-foreground text-sm">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-foreground text-2xl font-bold">{userPosts.length}</div>
                        <div className="text-muted-foreground text-sm">Posts</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 sm:p-6">
            <h2 className="mb-4 text-xl font-bold">Posts</h2>

            {isLoadingPosts ? (
              <div className="flex items-center justify-center py-12">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
                <span className="text-muted-foreground ml-2">Loading posts...</span>
              </div>
            ) : postsError ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-red-500">{postsError}</p>
                <Button onClick={retryLoadPosts} variant="outline">
                  Try Again
                </Button>
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
                <h3 className="mb-2 text-xl font-semibold">No posts yet</h3>
                <p className="text-muted-foreground">This user hasn&apos;t posted anything yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
