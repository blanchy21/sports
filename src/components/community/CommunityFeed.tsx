"use client";

import React from "react";
import Link from "next/link";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PostCard } from "@/components/PostCard";
import { useCommunityPosts } from "@/lib/react-query/queries/useCommunity";
import { Community } from "@/types";

interface CommunityFeedProps {
  community: Community;
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  community,
  limit = 20,
  showHeader = true,
  className,
}) => {
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCommunityPosts(community.id, { limit });

  const posts = data?.posts || [];

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Community Posts</h2>
          </div>
        )}
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Community Posts</h2>
          </div>
        )}
        <Card className="p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Failed to load posts</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Community Posts</h2>
          </div>
        )}
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-6">
            Be the first to share something with the {community.name} community!
          </p>
          <Link href={`/publish?community=${community.slug}`}>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Community Posts
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({posts.length})
            </span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post: { author: string; permlink: string; title?: string; body?: string; image?: string[]; sportCategory?: string; tags?: string[]; pendingPayout?: number; netVotes?: number; children?: number; created?: string }) => (
          <PostCard
            key={`${post.author}-${post.permlink}`}
            post={{
              id: `${post.author}/${post.permlink}`,
              title: post.title || 'Untitled',
              content: post.body || '',
              excerpt: post.body?.substring(0, 200) || '',
              author: {
                id: post.author,
                username: post.author,
                displayName: post.author,
                isHiveAuth: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              featuredImage: post.image?.[0],
              sport: {
                id: post.sportCategory || 'general',
                name: post.sportCategory || 'General',
                slug: post.sportCategory || 'general',
                icon: '🏆',
                color: 'bg-primary',
              },
              tags: post.tags || [],
              isPublished: true,
              isDraft: false,
              hiveUrl: `https://hive.blog/@${post.author}/${post.permlink}`,
              permlink: post.permlink,
              pendingPayout: post.pendingPayout || 0,
              netVotes: post.netVotes || 0,
              upvotes: post.netVotes || 0,
              comments: post.children || 0,
              readTime: Math.ceil((post.body?.length || 0) / 1000),
              createdAt: new Date(post.created || Date.now()),
              updatedAt: new Date(post.created || Date.now()),
            }}
          />
        ))}
      </div>

      {data?.hasMore && (
        <div className="text-center pt-4">
          <Link href={`/community/${community.id}`}>
            <Button variant="outline">
              View All Posts
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
