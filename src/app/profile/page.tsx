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
                      <span>Joined {user.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
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
                    {authType === "hive" && (
                      <>
                        <div>
                          <span className="font-bold">{user.hiveBalance?.toFixed(3) || 0}</span>
                          <span className="text-muted-foreground ml-1">HIVE</span>
                        </div>
                        <div>
                          <span className="font-bold">{user.hbdBalance?.toFixed(2) || 0}</span>
                          <span className="text-muted-foreground ml-1">HBD</span>
                        </div>
                      </>
                    )}
                  </div>
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
              {[1, 2, 3].map((post) => (
                <div key={post} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-start space-x-4">
                    <Image
                      src={`https://images.unsplash.com/photo-${1546519638 + post}-68e109498ffc?w=120&h=80&fit=crop`}
                      alt="Post thumbnail"
                      width={128}
                      height={80}
                      className="w-32 h-20 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold hover:text-primary transition-colors">
                        The Evolution of Basketball: From Naismith to the Modern NBA
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        Explore the fascinating journey of basketball from its humble beginnings to becoming one of the world&apos;s most popular sports.
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>Jan 15, 2024</span>
                        <span>•</span>
                        <span>5 min read</span>
                        <span>•</span>
                        <span>247 likes</span>
                        <span>•</span>
                        <span>23 comments</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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

