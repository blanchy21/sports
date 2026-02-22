'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useUserPosts } from '@/features/user/hooks/useUserPosts';
import { getProxyImageUrl, shouldProxyImage } from '@/lib/utils/image-proxy';
import {
  Eye,
  Heart,
  MessageCircle,
  DollarSign,
  Calendar,
  Award,
  BarChart3,
  FileText,
  RefreshCw,
  AlertCircle,
  Loader2,
  ExternalLink,
  Users,
  Zap,
} from 'lucide-react';
import { PotentialEarningsWidget } from '@/components/widgets/PotentialEarningsWidget';
import Link from 'next/link';
import type { SportsblockPost } from '@/lib/shared/types';

/**
 * Get the like/vote count from a post.
 * Handles both soft posts (likeCount) and Hive posts (net_votes).
 */
function getPostLikeCount(post: SportsblockPost): number {
  // Soft posts may have likeCount, Hive posts have net_votes
  const likeCount = (post as { likeCount?: number }).likeCount;
  return likeCount ?? post.net_votes ?? 0;
}

export default function DashboardPage() {
  const { user, authType, refreshHiveAccount, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Fetch user's recent posts
  const {
    posts: recentPosts,
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useUserPosts(user?.username || '', 5, {
    isHiveUser: authType === 'hive',
    userId: user?.id,
  });

  // Redirect if not authenticated (wait for auth to load first)
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  const handleRefreshData = async () => {
    if (authType !== 'hive') return;

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      await refreshHiveAccount();
    } catch {
      setRefreshError('Failed to refresh data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show skeleton while auth is loading (handled by loading.tsx for initial load)
  if (isAuthLoading) {
    return null; // Let loading.tsx handle it
  }

  // User not authenticated - redirect
  if (!user) {
    return (
      <MainLayout showRightSidebar={false} className="max-w-none">
        <div className="mx-auto max-w-4xl py-12 text-center">
          <h2 className="mb-2 text-xl font-semibold">Please sign in to view your dashboard</h2>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </MainLayout>
    );
  }

  // Stats - different for Hive vs soft users
  const stats: Array<{
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  }> =
    authType === 'hive'
      ? [
          {
            title: 'Total Posts',
            value: user.hiveStats?.postCount?.toString() || '0',
            icon: FileText,
            change: 'From Hive blockchain',
            changeType: 'neutral',
          },
          {
            title: 'Reputation',
            value: user.reputationFormatted || '25.00',
            icon: Award,
            change: 'From Hive blockchain',
            changeType: 'neutral',
          },
          {
            title: 'Total Following',
            value: user.hiveStats?.following?.toString() || '0',
            icon: Users,
            change: 'From Hive blockchain',
            changeType: 'neutral',
          },
          {
            title: 'Followers',
            value: user.hiveStats?.followers?.toString() || '0',
            icon: Eye,
            change: 'From Hive blockchain',
            changeType: 'neutral',
          },
        ]
      : [
          {
            title: 'Total Posts',
            value: recentPosts.length.toString(),
            icon: FileText,
            change: 'Your soft posts',
            changeType: 'neutral',
          },
          {
            title: 'Total Likes',
            value: recentPosts.reduce((sum, post) => sum + getPostLikeCount(post), 0).toString(),
            icon: Heart,
            change: 'Across all posts',
            changeType: 'neutral',
          },
          {
            title: 'Comments',
            value: recentPosts.reduce((sum, post) => sum + (post.children || 0), 0).toString(),
            icon: MessageCircle,
            change: 'Total engagement',
            changeType: 'neutral',
          },
          {
            title: 'Account Type',
            value: 'Free',
            icon: Users,
            change: 'Upgrade for rewards',
            changeType: 'neutral',
          },
        ];

  const rewardsStats: Array<{
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
  }> =
    authType === 'hive'
      ? [
          {
            title: 'Liquid HIVE',
            value: `${user.liquidHiveBalance?.toFixed(3) || '0.000'} HIVE`,
            icon: DollarSign,
            change: 'Liquid balance',
            changeType: 'neutral',
          },
          {
            title: 'Liquid HBD',
            value: `${user.liquidHbdBalance?.toFixed(3) || '0.000'} HBD`,
            icon: DollarSign,
            change: 'Liquid balance',
            changeType: 'neutral',
          },
          {
            title: 'HIVE Power',
            value: `${user.hivePower?.toFixed(3) || '0.000'} HP`,
            icon: Award,
            change: 'Staked HIVE',
            changeType: 'neutral',
          },
          {
            title: 'Resource Credits',
            value: `${user.rcPercentage?.toFixed(1) || '0.0'}%`,
            icon: BarChart3,
            change: 'Available RC',
            changeType: 'neutral',
          },
        ]
      : [];

  // Helper function to extract image from post body
  const extractImageFromPost = (body: string): string | null => {
    const imgRegex = /!\[.*?\]\((.*?)\)/;
    const match = body.match(imgRegex);
    return match ? match[1] : null;
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <MainLayout showRightSidebar={false} className="max-w-none">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Avatar
              src={user.avatar}
              fallback={user.username}
              alt={user.displayName || user.username}
              size="lg"
            />
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{user.displayName || user.username}</h1>
              <p className="text-muted-foreground">@{user.username}</p>
              {authType === 'hive' && (
                <div className="mt-1 flex items-center space-x-1">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Hive Authenticated</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {authType === 'hive' && (
              <Button
                variant="outline"
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            )}
            <Button onClick={() => router.push('/publish')}>Create Post</Button>
          </div>
        </div>

        {/* Error Message */}
        {refreshError && (
          <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 dark:text-red-200">{refreshError}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p
                      className={`text-xs ${
                        stat.changeType === 'positive'
                          ? 'text-accent'
                          : stat.changeType === 'negative'
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {stat.change}
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rewards Stats (Hive users only) */}
        {rewardsStats.length > 0 && (
          <div className="rounded-lg bg-gradient-to-r from-primary to-accent p-4 sm:p-6">
            <div className="mb-4 flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-white" />
              <h3 className="text-lg font-semibold text-white">Hive Account Balances</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {rewardsStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{stat.title}</p>
                        <p className="text-xl font-bold text-white">{stat.value}</p>
                        <p className="text-xs text-white">{stat.change}</p>
                      </div>
                      <div className="rounded-lg bg-white/20 p-2">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upgrade Prompt for Soft Users */}
        {authType === 'soft' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PotentialEarningsWidget />
            <div className="rounded-lg bg-gradient-to-r from-primary to-accent p-6 text-white">
              <div className="mb-3 flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Unlock Rewards</h3>
              </div>
              <p className="mb-4 text-sm text-white/90">
                Connect a Hive wallet to start earning cryptocurrency for your content. Your posts,
                votes, and engagement can all generate real rewards!
              </p>
              <ul className="mb-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-white/90">
                  <DollarSign className="h-4 w-4" />
                  Earn HIVE & HBD for posts
                </li>
                <li className="flex items-center gap-2 text-sm text-white/90">
                  <Heart className="h-4 w-4" />
                  Get curation rewards for voting
                </li>
                <li className="flex items-center gap-2 text-sm text-white/90">
                  <FileText className="h-4 w-4" />
                  Unlimited posts on blockchain
                </li>
              </ul>
              <Link href="/auth">
                <Button
                  variant="secondary"
                  className="bg-white font-semibold text-primary hover:bg-white/90"
                >
                  Connect Hive Wallet
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Posts */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Recent Posts</h3>
              </div>
              {authType === 'hive' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetchPosts}
                  disabled={postsLoading}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className={`h-3 w-3 ${postsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              )}
            </div>

            {postsError && (
              <div className="mb-4 flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 dark:text-red-200">{postsError}</span>
              </div>
            )}

            <div className="space-y-3">
              {postsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading posts...</span>
                </div>
              ) : recentPosts.length > 0 ? (
                recentPosts.map((post, index) => {
                  const thumbnail = extractImageFromPost(post.body);
                  return (
                    <div
                      key={`${post.author}-${post.permlink}` || `post-${index}`}
                      className="flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/post/${post.author}/${post.permlink}`)}
                    >
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        {thumbnail ? (
                          <Image
                            src={
                              shouldProxyImage(thumbnail) ? getProxyImageUrl(thumbnail) : thumbnail
                            }
                            alt={post.title}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-lg object-cover"
                            unoptimized={shouldProxyImage(thumbnail)}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-2 text-sm font-medium leading-tight">
                          {post.title}
                        </h4>
                        <div className="mt-2 flex items-center space-x-3 text-xs text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Heart className="h-3 w-3" />
                            <span>{post.net_votes}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{post.children}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>
                              {parseFloat(post.pending_payout_value || '0').toFixed(2)} HIVE
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(post.created)}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <h4 className="mb-2 font-medium text-muted-foreground">No posts yet</h4>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Start creating content to see your posts here!
                  </p>
                  <Button onClick={() => router.push('/publish')} size="sm">
                    Create Your First Post
                  </Button>
                </div>
              )}
            </div>

            {recentPosts.length > 0 && (
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => router.push(`/profile`)}
              >
                View All Posts
              </Button>
            )}
          </div>

          {/* Activity */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {[
                {
                  action: 'Account created',
                  target: user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : 'Unknown',
                  time: 'Account age',
                },
                {
                  action: 'Last post',
                  target: user.hiveStats?.postCount
                    ? `${user.hiveStats.postCount} posts`
                    : 'No posts yet',
                  time: user.lastPost ? new Date(user.lastPost).toLocaleDateString() : 'Never',
                },
                {
                  action: 'Last vote',
                  target: user.hiveStats?.voteCount
                    ? `${user.hiveStats.voteCount} total votes`
                    : 'No votes yet',
                  time: user.lastVote ? new Date(user.lastVote).toLocaleDateString() : 'Never',
                },
                {
                  action: 'Reputation',
                  target: user.reputationFormatted || '25.00',
                  time: 'Current reputation',
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="mt-2 h-2 w-2 rounded-full bg-primary"></div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.action}</span>
                      <span className="text-muted-foreground"> on </span>
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
