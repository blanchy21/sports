'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { PostCard } from '@/components/posts/PostCard';
import { useCommunityPosts } from '@/lib/react-query/queries/useCommunity';
import { Community } from '@/types';
import { interleaveAds } from '@/lib/utils/interleave-ads';
import type { DisplayPost } from '@/lib/utils/post-helpers';

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
  const { data, isLoading, error, refetch, isRefetching } = useCommunityPosts(community.id, {
    limit,
  });

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
          <div className="mb-4 text-4xl">⚠️</div>
          <h3 className="mb-2 text-lg font-semibold">Failed to load posts</h3>
          <p className="mb-4 text-muted-foreground">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
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
          <div className="mb-4 text-6xl">📝</div>
          <h3 className="mb-2 text-xl font-semibold">No posts yet</h3>
          <p className="mb-6 text-muted-foreground">
            Be the first to share something with the {community.name} community!
          </p>
          <Link href={`/publish?community=${community.slug}`}>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
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
            <span className="ml-2 text-sm font-normal text-muted-foreground">({posts.length})</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {interleaveAds(
          posts.map(
            (post: {
              id: string;
              author: string;
              permlink: string;
              title?: string;
              body?: string;
              featuredImage?: string;
              sportCategory?: string;
              tags?: string[];
              pendingPayout?: string;
              netVotes?: number;
              children?: number;
              created?: string;
              likeCount?: number;
              viewCount?: number;
              source?: 'hive' | 'soft';
              _isSoftPost?: boolean;
              _softPostId?: string;
              authorDisplayName?: string;
              authorAvatar?: string;
            }) => {
              const isSoft = post._isSoftPost || post.source === 'soft';
              const postKey = isSoft
                ? `soft-${post._softPostId || post.permlink}`
                : `${post.author}-${post.permlink}`;

              const displayPost: DisplayPost = {
                postType: 'display',
                author: post.author,
                permlink: post.permlink,
                title: post.title || 'Untitled',
                body: post.body || '',
                tags: post.tags || [],
                featuredImage: post.featuredImage,
                sportCategory: post.sportCategory,
                created: post.created || new Date().toISOString(),
                net_votes: post.netVotes || 0,
                children: post.children || 0,
                pending_payout_value: post.pendingPayout,
                authorDisplayName: post.authorDisplayName,
                authorAvatar: post.authorAvatar,
                source: isSoft ? 'soft' : 'hive',
                _isSoftPost: isSoft,
                _softPostId: post._softPostId,
                _likeCount: post.likeCount,
                _viewCount: post.viewCount,
              };

              return <PostCard key={postKey} post={displayPost} />;
            }
          )
        )}
      </div>

      {data?.hasMore && (
        <div className="pt-4 text-center">
          <Link href={`/community/${community.id}`}>
            <Button variant="outline">View All Posts</Button>
          </Link>
        </div>
      )}
    </div>
  );
};
