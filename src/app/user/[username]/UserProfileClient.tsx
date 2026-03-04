'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  MapPin,
  Calendar,
  Link as LinkIcon,
  ArrowLeft,
  Edit,
  Settings,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { PostCard } from '@/components/posts/PostCard';
import { SportsblockPost } from '@/lib/shared/types';
import { useUserProfile, useSoftUserProfile } from '@/lib/react-query/queries/useUserProfile';
import {
  useUserFollowerCount,
  useUserFollowingCount,
} from '@/lib/react-query/queries/useUserProfile';
import { useModal } from '@/components/modals/ModalProvider';
import { usePremiumTier } from '@/lib/premium/hooks';
import { PremiumBadge } from '@/components/medals';
import { StakingBadge } from '@/components/badges/StakingBadge';
import { FollowButton } from '@/components/user/FollowButton';
import { RoleBadge } from '@/components/user/RoleBadge';
import { RankBadge } from '@/components/badges/RankBadge';
import { BadgeGrid } from '@/components/badges/BadgeGrid';
import { useUserRank } from '@/lib/react-query/queries/useUserBadges';
import { LastSeenIndicator } from '@/components/user/LastSeenIndicator';
import { PredictionStatsCard } from '@/components/predictions/PredictionStatsCard';
import { DraftsContent } from '@/components/profile/DraftsContent';
import { RepliesContent } from '@/components/profile/RepliesContent';
import { BookmarksContent } from '@/components/profile/BookmarksContent';
import { FollowersContent } from '@/components/profile/FollowersContent';
import { FollowingContent } from '@/components/profile/FollowingContent';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { UserAccountData } from '@/lib/hive-workerbee/account';

type ProfileTab = 'posts' | 'drafts' | 'replies' | 'bookmarks' | 'following' | 'followers';

interface UserProfileClientProps {
  initialProfile?: UserAccountData | null;
}

export default function UserProfileClient({ initialProfile }: UserProfileClientProps) {
  const params = useParams();
  const router = useRouter();
  const { openModal } = useModal();
  const { user: currentUser, authType, refreshHiveAccount } = useAuth();
  const username = params.username as string;

  const isOwnProfile = !!currentUser && currentUser.username === username;

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

  // Determine which profile to use (prefer Hive, then server-provided initial, then soft)
  const effectiveHiveProfile = hiveProfile || initialProfile;
  const isProfileLoading = !effectiveHiveProfile && (isHiveLoading || isSoftLoading);
  const profile = effectiveHiveProfile || softProfile;
  const isSoftUser = !effectiveHiveProfile && !!softProfile;
  const profileError =
    !effectiveHiveProfile && !softProfile && !isProfileLoading ? hiveError : null;

  // Only fetch follower/following counts for Hive users
  const { data: followerCount } = useUserFollowerCount(effectiveHiveProfile ? username : '');
  const { data: followingCount } = useUserFollowingCount(effectiveHiveProfile ? username : '');
  const { tier: premiumTier } = usePremiumTier(effectiveHiveProfile ? username : '');
  const { rank: medalsRank } = useUserRank(username);

  const [userPosts, setUserPosts] = useState<SportsblockPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Owner-only state
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const retryLoadPosts = () => setRetryKey((k) => k + 1);

  const handleRefreshProfile = useCallback(async () => {
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
  }, [authType, refreshHiveAccount]);

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
            <div className="h-32 rounded-lg bg-muted sm:h-48"></div>
            <div className="flex items-center space-x-4">
              <div className="h-24 w-24 rounded-full bg-muted sm:h-32 sm:w-32"></div>
              <div className="flex-1 space-y-2">
                <div className="h-8 w-1/3 rounded bg-muted"></div>
                <div className="h-4 w-1/4 rounded bg-muted"></div>
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
            <div className="mb-4 text-6xl">&#x26A0;&#xFE0F;</div>
            <h3 className="mb-2 text-xl font-semibold">User Not Found</h3>
            <p className="mb-4 text-muted-foreground">
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

  // Owner-only tabs (hive users get following/followers tabs too)
  const ownerTabs: ProfileTab[] =
    isOwnProfile && authType === 'hive'
      ? ['posts', 'drafts', 'replies', 'bookmarks', 'following', 'followers']
      : isOwnProfile
        ? ['posts', 'drafts', 'replies', 'bookmarks']
        : [];

  const renderPostsContent = () => (
    <>
      {isLoadingPosts ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="ml-2 text-muted-foreground">Loading posts...</span>
        </div>
      ) : postsError ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-destructive">{postsError}</p>
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
          <div className="mb-4 text-6xl">&#x1F4DD;</div>
          <h3 className="mb-2 text-xl font-semibold">No posts yet</h3>
          {isOwnProfile ? (
            <>
              <p className="mb-6 text-muted-foreground">
                Start sharing your sports insights and connect with the community!
              </p>
              <Button onClick={() => router.push('/publish')}>
                <Edit className="mr-2 h-4 w-4" />
                Create Your First Post
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">This user hasn&apos;t posted anything yet.</p>
          )}
        </div>
      )}
    </>
  );

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back Button — only for other users' profiles */}
        {!isOwnProfile && (
          <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}

        {/* Profile Header */}
        <div className="overflow-hidden rounded-lg border bg-card">
          {/* Cover Photo */}
          <div className="relative h-32 bg-gradient-to-r from-primary via-bright-cobalt to-accent sm:h-48">
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
                  className="h-24 w-24 border-4 border-background sm:h-32 sm:w-32"
                />
              </div>

              <div className="mt-4 flex-1 text-center sm:text-left">
                <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-3">
                  <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                    {isSoftUser
                      ? (profile as { displayName?: string }).displayName || username
                      : (profile as { profile?: { name?: string } }).profile?.name || username}
                  </h1>
                  <RoleBadge username={username} size="md" />
                  {!isSoftUser && premiumTier && <PremiumBadge tier={premiumTier} size="md" />}
                  {!isSoftUser && premiumTier && <StakingBadge tier={premiumTier} size="md" />}
                  <RankBadge rank={medalsRank} size="md" />
                  {!isSoftUser &&
                    (profile as { reputationFormatted?: string }).reputationFormatted && (
                      <div className="rounded-full bg-accent/20 px-2 py-1 dark:bg-accent/20">
                        <span className="text-xs font-medium text-accent dark:text-accent">
                          Rep: {(profile as { reputationFormatted?: string }).reputationFormatted}
                        </span>
                      </div>
                    )}
                  {isSoftUser && (
                    <div className="rounded-full bg-info/15 px-2 py-1">
                      <span className="text-xs font-medium text-info">Sportsblock User</span>
                    </div>
                  )}

                  {/* Follow Button — only for OTHER users' profiles */}
                  {!isOwnProfile &&
                    isSoftUser &&
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

                {/* Owner action buttons — desktop */}
                {isOwnProfile && (
                  <div className="mt-2 hidden items-center space-x-2 sm:flex">
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
                )}

                <p className="mb-2 text-base text-muted-foreground sm:text-lg">@{username}</p>

                {/* Owner action buttons — mobile */}
                {isOwnProfile && (
                  <div className="mt-3 flex items-center space-x-2 sm:hidden">
                    {authType === 'hive' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshProfile}
                        disabled={isRefreshing}
                        className="flex items-center space-x-1.5"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                        <span className="text-xs">
                          {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </span>
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
                )}

                {/* Refresh error */}
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
                <div className="mt-4 space-y-3">
                  {!isSoftUser &&
                    (profile as { profile?: { location?: string } }).profile?.location && (
                      <div className="flex items-center space-x-3 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">
                          {(profile as { profile?: { location?: string } }).profile!.location}
                        </span>
                      </div>
                    )}

                  <div className="flex items-center space-x-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
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
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
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
                    <p className="max-w-2xl text-base leading-relaxed text-foreground">
                      {isSoftUser
                        ? (profile as { bio?: string }).bio
                        : (profile as { profile?: { about?: string } }).profile?.about}
                    </p>
                  </div>
                )}

                {/* Stats Section */}
                <div className="mt-6 flex items-center justify-center gap-4 border-t border-border pt-4 sm:justify-start sm:gap-6">
                  {!isSoftUser ? (
                    <>
                      <div
                        className="cursor-pointer text-center transition-opacity hover:opacity-70"
                        onClick={() =>
                          isOwnProfile
                            ? setActiveTab('following')
                            : openModal('followersList', { username, type: 'following' })
                        }
                      >
                        <div className="text-2xl font-bold text-foreground">
                          {followingCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Following</div>
                      </div>
                      <div
                        className="cursor-pointer text-center transition-opacity hover:opacity-70"
                        onClick={() =>
                          isOwnProfile
                            ? setActiveTab('followers')
                            : openModal('followersList', { username, type: 'followers' })
                        }
                      >
                        <div className="text-2xl font-bold text-foreground">
                          {followerCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">{userPosts.length}</div>
                        <div className="text-sm text-muted-foreground">Posts</div>
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
                        <div className="text-2xl font-bold text-foreground">
                          {softFollowingCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Following</div>
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
                        <div className="text-2xl font-bold text-foreground">
                          {softFollowerCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">{userPosts.length}</div>
                        <div className="text-sm text-muted-foreground">Posts</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <BadgeGrid username={username} />
        </div>

        {/* Prediction Stats */}
        <PredictionStatsCard username={username} />

        {/* Content Section */}
        {isOwnProfile ? (
          /* Owner view: tabbed content */
          <div className="rounded-lg border bg-card">
            <div className="flex items-center overflow-x-auto border-b border-border px-3 sm:px-6">
              {ownerTabs.map((tab) => (
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

            <div className="p-3 sm:p-6">
              {activeTab === 'posts' && renderPostsContent()}
              {activeTab === 'drafts' && <DraftsContent />}
              {activeTab === 'replies' && <RepliesContent />}
              {activeTab === 'bookmarks' && <BookmarksContent />}
              {activeTab === 'following' && <FollowingContent />}
              {activeTab === 'followers' && <FollowersContent />}
            </div>
          </div>
        ) : (
          /* Public view: posts only */
          <div className="rounded-lg border bg-card">
            <div className="p-4 sm:p-6">
              <h2 className="mb-4 text-xl font-bold">Posts</h2>
              {renderPostsContent()}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
