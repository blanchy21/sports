"use client";

import React from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { MapPin, Calendar, Link as LinkIcon, Edit, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, authType } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) {
    return null; // Will redirect
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="bg-card border rounded-lg overflow-hidden">
          {/* Cover Photo */}
          <div className="h-48 bg-gradient-to-r from-primary via-teal-500 to-cyan-500 relative">
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
                
                <div className="mt-4">
                  <h1 className="text-2xl font-bold">{user.displayName || user.username}</h1>
                  <p className="text-muted-foreground">@{user.username}</p>
                  
                  {authType === "hive" && (
                    <div className="flex items-center space-x-1 mt-1">
                      <span className="text-sm text-green-600 font-medium">✓ Hive Authenticated</span>
                      {user.reputationFormatted && (
                        <span className="text-sm text-muted-foreground">
                          • Rep: {user.reputationFormatted}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                    {user.hiveProfile?.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{user.hiveProfile.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {user.createdAt instanceof Date ? user.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}</span>
                    </div>
                    {/* Debug info - remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-500">
                        Debug: createdAt type: {typeof user.createdAt}, value: {JSON.stringify(user.createdAt)}
                      </div>
                    )}
                    {user.hiveProfile?.website && (
                      <div className="flex items-center space-x-1">
                        <LinkIcon className="h-4 w-4" />
                        <a href={user.hiveProfile.website} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                          {user.hiveProfile.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <p className="mt-4 text-base max-w-2xl">
                    {user.bio || user.hiveProfile?.about || "No bio available."}
                  </p>
                  
                  <div className="flex items-center space-x-4 mt-4">
                    <div>
                      <span className="font-bold">{user.hiveStats?.following || 0}</span>
                      <span className="text-muted-foreground ml-1">Following</span>
                    </div>
                    <div>
                      <span className="font-bold">{user.hiveStats?.followers || 0}</span>
                      <span className="text-muted-foreground ml-1">Followers</span>
                    </div>
                    <div>
                      <span className="font-bold">{user.hiveStats?.postCount || 0}</span>
                      <span className="text-muted-foreground ml-1">Posts</span>
                    </div>
                  </div>

                  {/* Debug section - remove this after testing */}
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm">
                    <h4 className="font-bold mb-2">Debug Info:</h4>
                    <p>Hive Stats: {JSON.stringify(user.hiveStats, null, 2)}</p>
                    <p>Liquid HIVE: {user.liquidHiveBalance}</p>
                    <p>Liquid HBD: {user.liquidHbdBalance}</p>
                    <p>Savings HIVE: {user.savingsHiveBalance}</p>
                    <p>Savings HBD: {user.savingsHbdBalance}</p>
                    <p>Savings APR: {user.savingsApr}</p>
                    <p>Pending Withdrawals: {user.pendingWithdrawals?.length || 0}</p>
                  </div>

                  {authType === "hive" && (
                    <div className="flex items-center space-x-4 mt-4">
                      <div>
                        <span className="font-bold">{user.hiveBalance?.toFixed(3) || 0}</span>
                        <span className="text-muted-foreground ml-1">HIVE</span>
                      </div>
                      <div>
                        <span className="font-bold">{user.hbdBalance?.toFixed(2) || 0}</span>
                        <span className="text-muted-foreground ml-1">HBD</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" className="flex items-center space-x-2">
                  <Edit className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Button>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card border rounded-lg">
          <div className="flex items-center border-b px-4">
            <button className="px-4 py-3 border-b-2 border-primary text-primary font-medium">
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
            <div className="space-y-4">
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
            </div>
            
            <div className="text-center mt-6">
              <Button variant="outline">Load More Posts</Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

