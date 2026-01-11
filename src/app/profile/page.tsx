"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { MapPin, Calendar, Link as LinkIcon, Edit, Settings, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard } from "@/components/PostCard";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
// getUserPosts is now accessed via API route
import { SportsblockPost } from "@/lib/shared/types";

export default function ProfilePage() {
  const { user, authType, refreshHiveAccount } = useAuth();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<SportsblockPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  const loadUserPosts = React.useCallback(async () => {
    if (!user?.username) return;
    
    setIsLoadingPosts(true);
    setPostsError(null);
    
    try {
      const response = await fetch(`/api/hive/posts?username=${encodeURIComponent(user.username)}&limit=20`);
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }
      const result = await response.json() as { success: boolean; posts: SportsblockPost[] };
      setUserPosts(result.success ? result.posts : []);
    } catch (error) {
      console.error("Error loading user posts:", error);
      setPostsError("Failed to load posts. Please try again.");
    } finally {
      setIsLoadingPosts(false);
    }
  }, [user?.username]);

  const handleRefreshProfile = async () => {
    if (authType !== "hive") return;
    
    setIsRefreshing(true);
    setRefreshError(null);
    
    try {
      await refreshHiveAccount();
    } catch {
      setRefreshError("Failed to refresh profile data. Please try again.");
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

  if (!user) {
    return null; // Will redirect
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* Cover Photo */}
          <div className="h-48 bg-gradient-to-r from-primary via-bright-cobalt to-accent relative">
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
                    className="w-32 h-32 border-4 border-background"
                  />
                </div>
                
                <div className="mt-4 flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">{user.displayName || user.username}</h1>
                    {authType === "hive" && (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 bg-accent/20 dark:bg-accent/20 px-2 py-1 rounded-full">
                          <div className="w-2 h-2 bg-accent rounded-full"></div>
                          <span className="text-xs font-medium text-accent-foreground dark:text-accent-foreground">Hive</span>
                        </div>
                        {user.reputationFormatted && (
                          <div className="bg-accent/20 dark:bg-accent/20 px-2 py-1 rounded-full">
                            <span className="text-xs font-medium text-accent dark:text-accent">
                              Rep: {user.reputationFormatted}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-lg text-muted-foreground mb-2">@{user.username}</p>
                  
                  {/* Error Display */}
                  {refreshError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-red-800 text-sm">{refreshError}</p>
                        <button
                          onClick={() => setRefreshError(null)}
                          className="text-red-600 hover:text-red-800 text-xs mt-1 underline"
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
                        Joined {user.createdAt instanceof Date ? user.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
                      </span>
                    </div>
                    
                    {user.hiveProfile?.website && (
                      <div className="flex items-center space-x-3 text-sm">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={user.hiveProfile.website} 
                          className="text-primary hover:underline transition-colors" 
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
                    <p className="text-base leading-relaxed text-foreground max-w-2xl">
                      {user.bio || user.hiveProfile?.about || "No bio available."}
                    </p>
                  </div>
                  
                  {/* Stats Section */}
                  <div className="flex items-center space-x-6 mt-6 pt-4 border-t border-border">
                    <button 
                      onClick={() => router.push('/following')}
                      className="text-center hover:opacity-70 transition-opacity cursor-pointer"
                    >
                      <div className="text-2xl font-bold text-foreground">
                        {isRefreshing ? '...' : (user.hiveStats?.following || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Following</div>
                    </button>
                    <button 
                      onClick={() => router.push('/followers')}
                      className="text-center hover:opacity-70 transition-opacity cursor-pointer"
                    >
                      <div className="text-2xl font-bold text-foreground">
                        {isRefreshing ? '...' : (user.hiveStats?.followers || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Followers</div>
                    </button>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {isRefreshing ? '...' : (user.hiveStats?.postCount || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Posts</div>
                    </div>
                  </div>


                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {authType === "hive" && (
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
                <Button variant="outline" className="flex items-center space-x-2">
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
        <div className="bg-card border rounded-lg">
          <div className="flex items-center border-b border-border px-6">
            <button className="px-4 py-3 border-b-2 border-primary text-primary font-medium transition-colors">
              Posts
            </button>
            <button className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors">
              About
            </button>
            <button className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors">
              Media
            </button>
            <button className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors">
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
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error loading posts</h3>
                <p className="text-muted-foreground mb-4">{postsError}</p>
                <Button onClick={loadUserPosts}>Try Again</Button>
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
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No posts yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Start sharing your sports insights and connect with the community!
                </p>
                <Button onClick={() => router.push("/publish")}>
                  <Edit className="h-4 w-4 mr-2" />
                  Create Your First Post
                </Button>
              </div>
            )}
            
            {userPosts.length > 0 && (
              <div className="text-center mt-6">
                <Button variant="outline" onClick={loadUserPosts}>
                  <RefreshCw className="h-4 w-4 mr-2" />
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

