"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCommunity, useCommunityMembers } from "@/lib/react-query/queries/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { JoinButton } from "./JoinButton";
import { CommunityFeed } from "./CommunityFeed";
import { 
  Users, 
  FileText, 
  Calendar, 
  Settings, 
  Globe, 
  Lock, 
  Mail,
  ArrowLeft,
  Edit,
  Shield,
  Crown
} from "lucide-react";
import { SPORT_CATEGORIES } from "@/types";
import { cn } from "@/lib/utils";

interface CommunityDetailProps {
  communityId: string;
  className?: string;
}

type TabType = 'posts' | 'about' | 'members';

export const CommunityDetail: React.FC<CommunityDetailProps> = ({ communityId, className }) => {
  const { user } = useAuth();
  const { data: community, isLoading, error } = useCommunity(communityId);
  const { data: members } = useCommunityMembers(communityId, { status: 'active', limit: 50 });
  
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  // Check user's role in community
  const userMembership = members?.find((m) => m.userId === user?.id);
  const isAdmin = userMembership?.role === 'admin';
  const isModerator = userMembership?.role === 'moderator' || isAdmin;

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-card border rounded-lg p-6 animate-pulse">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Community Not Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The community you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link href="/communities">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Communities
          </Button>
        </Link>
      </div>
    );
  }

  const sportCategory = SPORT_CATEGORIES.find((s) => s.id === community.sportCategory);
  const typeIcon = community.type === 'public' 
    ? <Globe className="h-5 w-5" /> 
    : community.type === 'private' 
      ? <Lock className="h-5 w-5" />
      : <Mail className="h-5 w-5" />;

  const admins = members?.filter((m) => m.role === 'admin') || [];
  const moderators = members?.filter((m) => m.role === 'moderator') || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cover Image */}
      {community.coverImage && (
        <div className="relative aspect-[3/1] rounded-xl overflow-hidden">
          <Image
            src={community.coverImage}
            alt={`${community.name} cover`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Community Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start space-x-4">
            <Avatar
              src={community.avatar}
              fallback={community.name}
              alt={community.name}
              size="lg"
              className="w-20 h-20 border-4 border-background shadow-lg"
            />
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">{community.name}</h1>
                <span className={cn(
                  "text-muted-foreground",
                  community.type === 'private' && "text-yellow-600",
                  community.type === 'invite-only' && "text-purple-600"
                )}>
                  {typeIcon}
                </span>
                {community.isVerified && (
                  <span className="text-blue-500 text-lg" title="Verified Community">✓</span>
                )}
              </div>
              
              {sportCategory && (
                <div className="flex items-center gap-1 text-muted-foreground mb-2">
                  <span className="text-lg">{sportCategory.icon}</span>
                  <span>{sportCategory.name}</span>
                </div>
              )}

              <p className="text-muted-foreground max-w-2xl">{community.about}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <JoinButton community={community} size="default" />
            
            {isAdmin && (
              <Button variant="outline" size="default">
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
        </div>
        
        {/* Community Stats */}
        <div className="flex items-center flex-wrap gap-6 mt-6 pt-6 border-t">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">{community.memberCount?.toLocaleString() || 0}</span>
            <span className="text-muted-foreground">members</span>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">{community.postCount?.toLocaleString() || 0}</span>
            <span className="text-muted-foreground">posts</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Created {new Date(community.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
              activeTab === 'posts'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Posts
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={cn(
              "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
              activeTab === 'about'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              "px-4 py-2 font-medium text-sm border-b-2 transition-colors",
              activeTab === 'members'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Members
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <CommunityFeed community={community} showHeader={false} />
      )}

      {activeTab === 'about' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">About {community.name}</h2>
          {community.description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {community.description}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">{community.about}</p>
          )}

          {/* Team Section */}
          {(admins.length > 0 || moderators.length > 0) && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4">Team</h3>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center gap-3">
                    <Avatar
                      fallback={admin.username}
                      alt={admin.username}
                      size="sm"
                    />
                    <div>
                      <Link href={`/user/${admin.hiveUsername || admin.username}`} className="font-medium hover:text-primary">
                        @{admin.hiveUsername || admin.username}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-yellow-600">
                        <Crown className="h-3 w-3" />
                        Admin
                      </div>
                    </div>
                  </div>
                ))}
                {moderators.map((mod) => (
                  <div key={mod.id} className="flex items-center gap-3">
                    <Avatar
                      fallback={mod.username}
                      alt={mod.username}
                      size="sm"
                    />
                    <div>
                      <Link href={`/user/${mod.hiveUsername || mod.username}`} className="font-medium hover:text-primary">
                        @{mod.hiveUsername || mod.username}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Shield className="h-3 w-3" />
                        Moderator
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'members' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Members
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({community.memberCount || 0})
              </span>
            </h2>
            {isModerator && (
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Manage Members
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members?.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <Avatar
                  fallback={member.username}
                  alt={member.username}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/user/${member.hiveUsername || member.username}`}
                    className="font-medium hover:text-primary truncate block"
                  >
                    @{member.hiveUsername || member.username}
                  </Link>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {member.role === 'admin' && (
                      <span className="text-yellow-600 flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Admin
                      </span>
                    )}
                    {member.role === 'moderator' && (
                      <span className="text-blue-600 flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Mod
                      </span>
                    )}
                    {member.role === 'member' && 'Member'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(!members || members.length === 0) && (
            <p className="text-center text-muted-foreground py-8">
              No members to display.
            </p>
          )}
        </Card>
      )}
    </div>
  );
};
