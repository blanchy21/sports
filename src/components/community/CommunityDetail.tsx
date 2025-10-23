"use client";

import React from "react";
import Image from "next/image";
import { useCommunity, useIsSubscribedToCommunity, useSubscribeToCommunity, useUnsubscribeFromCommunity } from "@/lib/react-query/queries/useCommunity";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Users, FileText, Calendar, Settings, Plus } from "lucide-react";

interface CommunityDetailProps {
  communityId: string;
  className?: string;
}

export const CommunityDetail: React.FC<CommunityDetailProps> = ({ communityId, className }) => {
  const { user } = useAuthStore();
  const { data: community, isLoading, error } = useCommunity(communityId);
  const { data: isSubscribed } = useIsSubscribedToCommunity(communityId, user?.hiveUsername || '');
  const subscribeMutation = useSubscribeToCommunity();
  const unsubscribeMutation = useUnsubscribeFromCommunity();

  const handleSubscribe = async () => {
    if (!user?.hiveUsername) return;
    
    if (isSubscribed) {
      await unsubscribeMutation.mutateAsync({ communityId, username: user.hiveUsername });
    } else {
      await subscribeMutation.mutateAsync({ communityId, username: user.hiveUsername });
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-card border rounded-lg p-6 animate-pulse">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-8 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
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
        <p className="text-gray-500 dark:text-gray-400">
          The community you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Community Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar
              src={community.avatar}
              fallback={community.name}
              alt={community.title}
              size="lg"
              className="w-20 h-20"
            />
            
            <div>
              <h1 className="text-3xl font-bold">{community.title}</h1>
              <p className="text-muted-foreground mb-2">@{community.name}</p>
              <p className="text-muted-foreground max-w-2xl">{community.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {user && (
              <Button
                onClick={handleSubscribe}
                disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
                variant={isSubscribed ? "outline" : "default"}
              >
                {isSubscribed ? (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Subscribed
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            )}
            
            {user?.hiveUsername === community.team[0]?.username && (
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
        </div>
        
        {/* Community Stats */}
        <div className="flex items-center space-x-8 mt-6 pt-6 border-t">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">{community.subscribers.toLocaleString()}</span>
            <span className="text-muted-foreground">subscribers</span>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">{community.posts.toLocaleString()}</span>
            <span className="text-muted-foreground">posts</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Created {new Date(community.created).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Cover Image */}
      {community.coverImage && (
        <Card className="overflow-hidden">
          <div className="aspect-video relative">
            <Image
              src={community.coverImage}
              alt={`${community.title} cover`}
              fill
              className="object-cover"
            />
          </div>
        </Card>
      )}

      {/* Community About */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">About {community.title}</h2>
        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground leading-relaxed">
            {community.description}
          </p>
        </div>
      </Card>
    </div>
  );
};
