"use client";

import React from "react";
import { useCommunity } from "@/lib/react-query/queries/useCommunity";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Users, FileText, Calendar, Globe, Mail } from "lucide-react";

interface CommunityAboutProps {
  communityId: string;
  className?: string;
}

export const CommunityAbout: React.FC<CommunityAboutProps> = ({ communityId, className }) => {
  const { data: community, isLoading, error } = useCommunity(communityId);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-6 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </Card>
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
          The community you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Community Info */}
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Avatar
            src={community.avatar}
            fallback={community.name}
            alt={community.title}
            size="lg"
            className="w-16 h-16"
          />
          <div>
            <h2 className="text-2xl font-bold">{community.title}</h2>
            <p className="text-muted-foreground">@{community.name}</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground leading-relaxed mb-6">
            {community.description}
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Subscribers</span>
            </div>
            <div className="text-2xl font-bold">{community.subscribers.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Posts</span>
            </div>
            <div className="text-2xl font-bold">{community.posts.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Created</span>
            </div>
            <div className="text-sm font-medium">
              {new Date(community.created).toLocaleDateString()}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
              <Globe className="h-4 w-4" />
              <span className="text-sm">Status</span>
            </div>
            <div className="text-sm font-medium text-green-600">Active</div>
          </div>
        </div>
      </Card>

      {/* Community Team */}
      {community.team && community.team.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Community Team</h3>
          <div className="space-y-3">
            {community.team.map((member) => (
              <div key={member.username} className="flex items-center space-x-3">
                <Avatar
                  fallback={member.username}
                  alt={member.username}
                  size="md"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">@{member.username}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.role === 'admin' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : member.role === 'moderator'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Community Rules/Guidelines */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Community Guidelines</h3>
        <div className="prose prose-sm max-w-none">
          <ul className="space-y-2 text-muted-foreground">
            <li>• Be respectful and constructive in your discussions</li>
            <li>• Stay on topic and relevant to the community theme</li>
            <li>• No spam, self-promotion, or off-topic content</li>
            <li>• Follow Hive blockchain rules and guidelines</li>
            <li>• Report inappropriate content to moderators</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
