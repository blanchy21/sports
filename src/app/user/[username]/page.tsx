"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { MapPin, Calendar, Link as LinkIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard } from "@/components/PostCard";
// getUserPosts is now accessed via API route
import { SportsblockPost } from "@/lib/shared/types";
import { useUserProfile, useSoftUserProfile } from "@/lib/react-query/queries/useUserProfile";
import { useUserFollowerCount, useUserFollowingCount } from "@/lib/react-query/queries/useUserProfile";
import { useModal } from "@/components/modals/ModalProvider";
import { usePremiumTier } from "@/lib/premium/hooks";
import { PremiumBadge } from "@/components/medals";
import { FollowButton } from "@/components/FollowButton";
import { LastSeenIndicator } from "@/components/LastSeenIndicator";
import { useAuth } from "@/contexts/AuthContext";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { openModal } = useModal();
  const { user: currentUser, authType } = useAuth();
  const username = params.username as string;

  // Try to fetch Hive profile first
  const { data: hiveProfile, isLoading: isHiveLoading, error: hiveError } = useUserProfile(username);

  // Soft user follow stats
  const [softFollowerCount, setSoftFollowerCount] = useState(0);
  const [softFollowingCount, setSoftFollowingCount] = useState(0);

  // If Hive profile not found, try soft user profile
  const shouldFetchSoft = !isHiveLoading && !hiveProfile;
  const { data: softProfile, isLoading: isSoftLoading } = useSoftUserProfile(
    shouldFetchSoft ? username : ''
  );

  // Determine which profile to use
  const profile = hiveProfile || softProfile;
  const isSoftUser = !hiveProfile && !!softProfile;
  const isProfileLoading = isHiveLoading || (shouldFetchSoft && isSoftLoading);
  const profileError = !hiveProfile && !softProfile && !isProfileLoading ? hiveError : null;

  // Only fetch follower/following counts for Hive users
  const { data: followerCount } = useUserFollowerCount(hiveProfile ? username : '');
  const { data: followingCount } = useUserFollowingCount(hiveProfile ? username : '');
  const { tier: premiumTier } = usePremiumTier(hiveProfile ? username : '');
  
  const [userPosts, setUserPosts] = useState<SportsblockPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const retryLoadPosts = () => setRetryKey(k => k + 1);

  // Fetch soft user follower/following counts
  useEffect(() => {
    if (!isSoftUser || !softProfile) return;

    const fetchSoftFollowStats = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (currentUser?.id && authType === 'soft') {
          headers['x-user-id'] = currentUser.id;
        }

        const response = await fetch('/api/soft/follows', {
          method: 'PUT',
          headers,
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
        const posts = result.success ? (result.posts || []).map((p: Record<string, unknown>) => ({
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
        })) : [];
        setUserPosts(posts);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error("Error loading user posts:", error);
        setPostsError("Failed to load posts. Please try again.");
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
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="flex items-center space-x-4">
              <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
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
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2">User Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The user profile you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push("/")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* Cover Photo */}
          <div className="h-48 bg-gradient-to-r from-primary via-bright-cobalt to-accent relative">
            {!isSoftUser && (profile as { profile?: { coverImage?: string } }).profile?.coverImage && (
              <Image
                src={(profile as { profile?: { coverImage?: string } }).profile!.coverImage!}
                alt="Cover"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                className="object-cover"
              />
            )}
          </div>

          {/* Profile Info */}
          <div className="p-6">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="relative -mt-16">
                <Avatar
                  src={isSoftUser
                    ? (profile as { avatarUrl?: string }).avatarUrl
                    : (profile as { profile?: { profileImage?: string } }).profile?.profileImage}
                  alt={isSoftUser
                    ? (profile as { displayName?: string }).displayName || username
                    : (profile as { profile?: { name?: string } }).profile?.name || username}
                  fallback={username}
                  size="lg"
                  className="w-32 h-32 border-4 border-background"
                />
              </div>

              <div className="mt-4 flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {isSoftUser
                      ? (profile as { displayName?: string }).displayName || username
                      : (profile as { profile?: { name?: string } }).profile?.name || username}
                  </h1>
                  {!isSoftUser && premiumTier && (
                    <PremiumBadge tier={premiumTier} size="md" />
                  )}
                  {!isSoftUser && (profile as { reputationFormatted?: string }).reputationFormatted && (
                    <div className="bg-accent/20 dark:bg-accent/20 px-2 py-1 rounded-full">
                      <span className="text-xs font-medium text-accent dark:text-accent">
                        Rep: {(profile as { reputationFormatted?: string }).reputationFormatted}
                      </span>
                    </div>
                  )}
                  {isSoftUser && (
                    <div className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Sportsblock User
                      </span>
                    </div>
                  )}
                  {/* Follow Button for soft users */}
                  {isSoftUser && softProfile && currentUser?.id !== (softProfile as { id?: string }).id && (
                    <FollowButton
                      targetUserId={(softProfile as { id?: string }).id || ''}
                      targetUsername={username}
                      initialFollowerCount={softFollowerCount}
                      onFollowChange={(_, newCount) => setSoftFollowerCount(newCount)}
                    />
                  )}
                </div>
                <p className="text-lg text-muted-foreground mb-2">@{username}</p>

                {/* Profile Details */}
                <div className="mt-4 space-y-3">
                  {!isSoftUser && (profile as { profile?: { location?: string } }).profile?.location && (
                    <div className="flex items-center space-x-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{(profile as { profile?: { location?: string } }).profile!.location}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Last seen indicator for soft users */}
                  {isSoftUser && (softProfile as { lastActiveAt?: string }).lastActiveAt && (
                    <LastSeenIndicator
                      lastActiveAt={(softProfile as { lastActiveAt?: string }).lastActiveAt}
                    />
                  )}

                  {!isSoftUser && (profile as { profile?: { website?: string } }).profile?.website && (
                    <div className="flex items-center space-x-3 text-sm">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={(profile as { profile?: { website?: string } }).profile!.website!}
                        className="text-primary hover:underline transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {(profile as { profile?: { website?: string } }).profile!.website!.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Bio Section */}
                {(isSoftUser
                  ? (profile as { bio?: string }).bio
                  : (profile as { profile?: { about?: string } }).profile?.about
                ) && (
                  <div className="mt-6">
                    <p className="text-base leading-relaxed text-foreground max-w-2xl">
                      {isSoftUser
                        ? (profile as { bio?: string }).bio
                        : (profile as { profile?: { about?: string } }).profile?.about}
                    </p>
                  </div>
                )}

                {/* Stats Section */}
                <div className="flex items-center space-x-6 mt-6 pt-4 border-t border-border">
                  {!isSoftUser ? (
                    <>
                      <div
                        className="text-center cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={() => openModal('followersList', { username, type: 'following' })}
                      >
                        <div className="text-2xl font-bold text-foreground">
                          {followingCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Following</div>
                      </div>
                      <div
                        className="text-center cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={() => openModal('followersList', { username, type: 'followers' })}
                      >
                        <div className="text-2xl font-bold text-foreground">
                          {followerCount || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">
                          {userPosts.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Posts</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="text-center cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={() => openModal('softFollowersList', { userId: (softProfile as { id?: string }).id, username, type: 'following' })}
                      >
                        <div className="text-2xl font-bold text-foreground">
                          {softFollowingCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Following</div>
                      </div>
                      <div
                        className="text-center cursor-pointer hover:opacity-70 transition-opacity"
                        onClick={() => openModal('softFollowersList', { userId: (softProfile as { id?: string }).id, username, type: 'followers' })}
                      >
                        <div className="text-2xl font-bold text-foreground">
                          {softFollowerCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">
                          {userPosts.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Posts</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="bg-card border rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Posts</h2>
            
            {isLoadingPosts ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-2 text-muted-foreground">Loading posts...</span>
              </div>
            ) : postsError ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{postsError}</p>
                <Button onClick={retryLoadPosts} variant="outline">Try Again</Button>
              </div>
            ) : userPosts.length > 0 ? (
              <div className="space-y-6">
                {userPosts.map((post) => (
                  <PostCard key={`${post.author}-${post.permlink}`} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">
                  This user hasn&apos;t posted anything yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
