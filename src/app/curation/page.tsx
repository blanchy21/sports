'use client';

/**
 * Curation Dashboard
 *
 * Accessible to admins and curators. Shows:
 * 1. Curator daily stats (curations used / remaining)
 * 2. Eligible posts (with sportsblock 5% beneficiary)
 * 3. Recent curations log
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/core/Button';
import { CurateButton } from '@/components/curation/CurateButton';
import { CurationBadge } from '@/components/curation/CurationBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useCuratorStatus } from '@/hooks/useCuratorStatus';
import {
  Award,
  RefreshCw,
  Eye,
  MessageCircle,
  TrendingUp,
  CheckCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils/client';

interface EligiblePost {
  author: string;
  permlink: string;
  title: string;
  created: string;
  netVotes: number;
  comments: number;
  pendingPayout: string;
  sportCategory: string | null;
  curated: boolean;
  totalMedalsCurated: number;
  curators: Array<{ username: string; amount: number; curatedAt: string }>;
  engagement: {
    views: number;
    uniqueViews: number;
    votes: number;
    comments: number;
    totalEngagement: number;
  } | null;
}

type FilterMode = 'all' | 'uncurated' | 'curated';

export default function CurationDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const curatorStatus = useCuratorStatus();

  const [posts, setPosts] = useState<EligiblePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');

  const fetchPosts = useCallback(async () => {
    try {
      const curatedParam = filter === 'all' ? '' : `&curated=${filter === 'curated'}`;
      const res = await fetch(`/api/curation/eligible?limit=30${curatedParam}`);
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
    curatorStatus.refetch();
  };

  if (authLoading || loading) {
    return (
      <MainLayout showRightSidebar={false}>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-sb-text-muted" />
        </div>
      </MainLayout>
    );
  }

  const curatedCount = posts.filter((p) => p.curated).length;
  const uncuratedCount = posts.filter((p) => !p.curated).length;

  return (
    <MainLayout showRightSidebar={false}>
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-7 w-7 text-sb-gold" />
            <div>
              <h1 className="font-display text-2xl font-bold text-sb-text-primary">
                Curation Dashboard
              </h1>
              <p className="text-sm text-sb-text-muted">Award MEDALS to quality sports content</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Curator Stats Card */}
        {curatorStatus.isCurator && (
          <div className="rounded-xl border border-sb-border bg-sb-stadium p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sb-text-muted">
              Your Curations Today
            </h2>
            <div className="flex items-center gap-6">
              <div>
                <span className="font-mono text-3xl font-bold text-sb-gold">
                  {curatorStatus.remaining}
                </span>
                <span className="text-sm text-sb-text-muted">
                  {' '}
                  / {curatorStatus.limit} remaining
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: curatorStatus.limit }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-3 w-8 rounded-full',
                      i < curatorStatus.dailyCount ? 'bg-sb-gold' : 'bg-sb-floodlight'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-sb-border pb-2">
          <Filter className="h-4 w-4 text-sb-text-muted" />
          {(['all', 'uncurated', 'curated'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filter === mode
                  ? 'bg-sb-teal text-black'
                  : 'text-sb-text-muted hover:text-sb-text-primary'
              )}
            >
              {mode === 'all' && `All (${posts.length})`}
              {mode === 'uncurated' && `Uncurated (${uncuratedCount})`}
              {mode === 'curated' && `Curated (${curatedCount})`}
            </button>
          ))}
        </div>

        {/* Eligible Posts Feed */}
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="rounded-xl border border-sb-border-subtle bg-sb-stadium p-8 text-center">
              <Award className="mx-auto mb-3 h-10 w-10 text-sb-text-muted" />
              <p className="text-sb-text-muted">No eligible posts found</p>
              <p className="mt-1 text-xs text-sb-text-muted">
                Posts must have the sportsblock 5% beneficiary to be eligible
              </p>
            </div>
          ) : (
            posts.map((post) => <PostRow key={`${post.author}/${post.permlink}`} post={post} />)
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function PostRow({ post }: { post: EligiblePost }) {
  const relativeTime = getRelativeTime(post.created);

  return (
    <div
      className={cn(
        'rounded-xl border bg-sb-stadium p-4 transition-colors',
        post.curated ? 'border-sb-gold-shadow' : 'border-sb-border hover:border-sb-border'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Post info */}
        <div className="min-w-0 flex-1">
          <a
            href={`/post/${post.author}/${post.permlink}`}
            className="line-clamp-1 font-display text-lg font-semibold text-sb-text-primary transition-colors hover:text-sb-teal"
          >
            {post.title}
          </a>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-sb-text-muted">
            <span>@{post.author}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeTime}
            </span>
            {post.sportCategory && (
              <span className="rounded-full bg-sb-turf px-2 py-0.5 text-sb-teal">
                {post.sportCategory}
              </span>
            )}
            {post.curated && (
              <CurationBadge
                totalMedals={post.totalMedalsCurated}
                curatorCount={post.curators.length}
              />
            )}
          </div>

          {/* Engagement stats */}
          <div className="mt-2 flex items-center gap-4 text-xs text-sb-text-muted">
            <span className="flex items-center gap-1" title="Hive votes">
              <TrendingUp className="h-3 w-3" />
              {post.netVotes} votes
            </span>
            <span className="flex items-center gap-1" title="Comments">
              <MessageCircle className="h-3 w-3" />
              {post.comments}
            </span>
            {post.engagement && (
              <>
                <span className="flex items-center gap-1" title="Views on SportsBlock">
                  <Eye className="h-3 w-3" />
                  {post.engagement.views} views
                </span>
                <span className="flex items-center gap-1" title="Total engagement score">
                  <TrendingUp className="h-3 w-3 text-sb-teal" />
                  {post.engagement.totalEngagement}
                </span>
              </>
            )}
            <span className="font-mono text-sb-gold">{post.pendingPayout}</span>
          </div>

          {/* Curators who already curated this */}
          {post.curators.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <CheckCircle className="h-3 w-3 text-sb-gold" />
              <span className="text-sb-text-muted">
                Curated by{' '}
                {post.curators.map((c, i) => (
                  <span key={c.username}>
                    {i > 0 && ', '}
                    <span className="text-sb-gold">@{c.username}</span>
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>

        {/* Curate action */}
        <div className="flex-shrink-0">
          <CurateButton
            author={post.author}
            permlink={post.permlink}
            alreadyCurated={post.curators.some(
              (c) => c.username === post.author // This check is wrong, should check against current user
            )}
          />
        </div>
      </div>
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
