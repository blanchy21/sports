'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/core/Button';
import { Card } from '@/components/core/Card';
import { PostCard } from '@/components/posts/PostCard';
import { useCommunityPosts } from '@/lib/react-query/queries/useCommunity';
import { Community, Post } from '@/types';

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
        {posts.map(
          (post: {
            id: string;
            author: string;
            permlink: string;
            title?: string;
            body?: string;
            excerpt?: string;
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
            const isSoftPost = post._isSoftPost || post.source === 'soft';
            const postKey = isSoftPost
              ? `soft-${post._softPostId || post.permlink}`
              : `${post.author}-${post.permlink}`;

            // Build the post object for PostCard, using type assertion for soft post fields
            const postCardData = {
              postType: 'standard' as const,
              id: post.id || `${post.author}/${post.permlink}`,
              title: post.title || 'Untitled',
              content: post.body || '',
              excerpt: post.excerpt || post.body?.substring(0, 200) || '',
              author: {
                id: post.author,
                username: post.author,
                displayName: post.authorDisplayName || post.author,
                avatar: post.authorAvatar,
                isHiveAuth: !isSoftPost,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              featuredImage: post.featuredImage,
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
              hiveUrl: isSoftPost
                ? undefined
                : `https://hive.blog/@${post.author}/${post.permlink}`,
              permlink: post.permlink,
              pendingPayout:
                typeof post.pendingPayout === 'string'
                  ? parseFloat(post.pendingPayout) || 0
                  : post.pendingPayout || 0,
              netVotes: post.netVotes || 0,
              upvotes: isSoftPost ? post.likeCount || 0 : post.netVotes || 0,
              comments: post.children || 0,
              readTime: Math.ceil((post.body?.length || 0) / 1000),
              createdAt: new Date(post.created || Date.now()),
              updatedAt: new Date(post.created || Date.now()),
              // Soft post specific fields (read by PostCard via type assertion)
              _isSoftPost: isSoftPost,
              _softPostId: post._softPostId,
              _likeCount: post.likeCount,
              _viewCount: post.viewCount,
            } as Post & {
              _isSoftPost?: boolean;
              _softPostId?: string;
              _likeCount?: number;
              _viewCount?: number;
            };

            return <PostCard key={postKey} post={postCardData} />;
          }
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
