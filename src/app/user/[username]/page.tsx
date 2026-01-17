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
import { useUserProfile } from "@/lib/react-query/queries/useUserProfile";
import { useUserFollowerCount, useUserFollowingCount } from "@/lib/react-query/queries/useUserProfile";
import { useModal } from "@/components/modals/ModalProvider";
import { usePremiumTier } from "@/lib/premium/hooks";
import { PremiumBadge } from "@/components/medals";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { openModal } = useModal();
  const username = params.username as string;
  
  const { data: profile, isLoading: isProfileLoading, error: profileError } = useUserProfile(username);
  const { data: followerCount } = useUserFollowerCount(username);
  const { data: followingCount } = useUserFollowingCount(username);
  const { tier: premiumTier } = usePremiumTier(username);
  
  const [userPosts, setUserPosts] = useState<SportsblockPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const retryLoadPosts = () => setRetryKey(k => k + 1);

  useEffect(() => {
    if (!username) return;

    const abortController = new AbortController();

    const loadUserPosts = async () => {
      setIsLoadingPosts(true);
      setPostsError(null);

      try {
        const response = await fetch(
          `/api/hive/posts?username=${encodeURIComponent(username)}&limit=20`,
          { signal: abortController.signal }
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch posts: ${response.status}`);
        }
        const result = await response.json() as { success: boolean; posts: SportsblockPost[] };
        setUserPosts(result.success ? result.posts : []);
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
  }, [username, retryKey]);

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
            {profile.profile?.coverImage && (
              <Image
                src={profile.profile.coverImage}
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
                  src={profile.profile?.profileImage}
                  alt={profile.profile?.name || username}
                  fallback={username}
                  size="lg"
                  className="w-32 h-32 border-4 border-background"
                />
              </div>
              
              <div className="mt-4 flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {profile.profile?.name || username}
                  </h1>
                  {premiumTier && (
                    <PremiumBadge tier={premiumTier} size="md" />
                  )}
                  {profile.reputationFormatted && (
                    <div className="bg-accent/20 dark:bg-accent/20 px-2 py-1 rounded-full">
                      <span className="text-xs font-medium text-accent dark:text-accent">
                        Rep: {profile.reputationFormatted}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-lg text-muted-foreground mb-2">@{username}</p>
                
                {/* Profile Details */}
                <div className="mt-4 space-y-3">
                  {profile.profile?.location && (
                    <div className="flex items-center space-x-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{profile.profile.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  
                  {profile.profile?.website && (
                    <div className="flex items-center space-x-3 text-sm">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={profile.profile.website} 
                        className="text-primary hover:underline transition-colors" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {profile.profile.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Bio Section */}
                {profile.profile?.about && (
                  <div className="mt-6">
                    <p className="text-base leading-relaxed text-foreground max-w-2xl">
                      {profile.profile.about}
                    </p>
                  </div>
                )}
                
                {/* Stats Section */}
                <div className="flex items-center space-x-6 mt-6 pt-4 border-t border-border">
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
