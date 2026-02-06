'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { Loading } from '@/components/core/Loading';
import { StarVoteButton } from '@/components/voting/StarVoteButton';
import { SoftLikeButton } from '@/components/voting/SoftLikeButton';
import { ArrowLeft, MessageCircle, Bookmark, Share, Calendar, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
// fetchPost is now accessed via API route
import { SportsblockPost } from '@/lib/shared/types';
import { calculatePendingPayout, formatAsset } from '@/lib/utils/hive';

/**
 * Soft post metadata stored separately from the main post state.
 * This avoids type conflicts with SportsblockPost.
 */
interface SoftPostMeta {
  id: string;
  authorDisplayName?: string;
  authorAvatar?: string;
}
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { useModal } from '@/components/modals/ModalProvider';
import { useBookmarks } from '@/hooks/useBookmarks';
import { formatDate, formatReadTime } from '@/lib/utils/client';
import { proxyImagesInContent } from '@/lib/utils/image-proxy';
import { sanitizePostContent } from '@/lib/utils/sanitize';
import { logger } from '@/lib/logger';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { openModal } = useModal();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [post, setPost] = useState<SportsblockPost | null>(null);
  const [softPostMeta, setSoftPostMeta] = useState<SoftPostMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const author = params.author as string;
  const permlink = params.permlink as string;

  // Fetch Hive user profile (only for non-soft posts)
  const { profile: hiveProfile, isLoading: isProfileLoading } = useUserProfile(author);

  // Track if this is a soft post for different UI handling
  const [isSoftPost, setIsSoftPost] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    const loadPost = async () => {
      if (!author || !permlink) return;

      setIsLoading(true);
      setError(null);
      setIsSoftPost(false);

      try {
        // First try to fetch from Hive
        const hiveResponse = await fetch(
          `/api/hive/posts?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}`,
          { signal: abortController.signal }
        );

        if (hiveResponse.ok) {
          const result = (await hiveResponse.json()) as {
            success: boolean;
            post: SportsblockPost | null;
          };
          if (result.success && result.post) {
            setPost(result.post);
            return;
          }
        }

        // If not found on Hive, try soft posts
        const softResponse = await fetch(
          `/api/posts/by-permlink?permlink=${encodeURIComponent(permlink)}`,
          { signal: abortController.signal }
        );

        if (softResponse.ok) {
          const softResult = await softResponse.json();
          if (softResult.success && softResult.post) {
            // Convert soft post to SportsblockPost-like format
            const softPost = softResult.post;
            // Store soft post metadata separately to avoid type conflicts
            setSoftPostMeta({
              id: softPost.id,
              authorDisplayName: softPost.authorDisplayName,
              authorAvatar: softPost.authorAvatar,
            });
            // Create a compatible post object
            setPost({
              postType: 'sportsblock',
              isSportsblockPost: true,
              id: 0, // Soft posts use string IDs stored in softPostMeta
              author: softPost.authorUsername,
              permlink: softPost.permlink,
              title: softPost.title,
              body: softPost.content,
              created: softPost.createdAt,
              last_update: softPost.updatedAt || softPost.createdAt,
              category: softPost.sportCategory || 'general',
              tags: softPost.tags || [],
              sportCategory: softPost.sportCategory,
              json_metadata: JSON.stringify({ tags: softPost.tags }),
              net_votes: softPost.likeCount || 0,
              children: 0,
              pending_payout_value: '0.000 HBD',
              curator_payout_value: '0.000 HBD',
              total_payout_value: '0.000 HBD',
              active_votes: [],
              // Required HivePost fields with defaults
              parent_author: '',
              parent_permlink: softPost.sportCategory || 'general',
              active: softPost.createdAt,
              last_payout: '',
              depth: 0,
              net_rshares: '0',
              abs_rshares: '0',
              vote_rshares: '0',
              children_abs_rshares: '0',
              cashout_time: '',
              max_cashout_time: '',
              total_vote_weight: '0',
              reward_weight: 100,
              author_rewards: '0',
              root_author: softPost.authorUsername,
              root_permlink: softPost.permlink,
              max_accepted_payout: '1000000.000 HBD',
              percent_hbd: 10000,
              allow_replies: true,
              allow_votes: true,
              allow_curation_rewards: true,
              beneficiaries: [],
              url: `/@${softPost.authorUsername}/${softPost.permlink}`,
              root_title: softPost.title,
              total_pending_payout_value: '0.000 HBD',
              replies: [],
              author_reputation: '0',
              promoted: '0.000 HBD',
              body_length: softPost.content?.length || 0,
              reblogged_by: [],
            });
            setIsSoftPost(true);
            return;
          }
        }

        setError('Post not found');
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return;
        logger.error('Error loading post', 'PostDetailPage', err);
        setError('Failed to load post. Please try again.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadPost();

    return () => {
      abortController.abort();
    };
  }, [author, permlink]);

  const handleVoteSuccess = () => {
    // Vote recorded - could trigger a refresh of the post data here
  };

  const handleVoteError = () => {
    // Vote error handled by the component that displays it
  };

  const handleComment = () => {
    if (!post) return;
    if (isSoftPost && softPostMeta) {
      // Open soft comments modal for soft posts
      openModal('softComments', {
        postId: softPostMeta.id,
        postPermlink: post.permlink,
        postAuthor: post.author,
      });
    } else {
      openModal('comments', {
        author: post.author,
        permlink: post.permlink,
      });
    }
  };

  const handleBookmark = () => {
    if (!post) return;
    toggleBookmark(post);
  };

  const handleShare = () => {
    if (!post) return;
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl p-6">
          <Loading text="Loading post..." skeleton skeletonLines={5} />
        </div>
      </MainLayout>
    );
  }

  if (error || !post) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl p-6">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-red-600">Post Not Found</h1>
            <p className="mb-6 text-gray-600">
              {error || "The post you're looking for doesn't exist."}
            </p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const pendingPayout = calculatePendingPayout(post);

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl p-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Post Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center space-x-3">
            <Avatar
              src={isSoftPost ? softPostMeta?.authorAvatar : hiveProfile?.avatar}
              fallback={post.author}
              alt={
                isSoftPost
                  ? softPostMeta?.authorDisplayName || post.author
                  : hiveProfile?.displayName || post.author
              }
              size="md"
              className={!isSoftPost && isProfileLoading ? 'animate-pulse' : ''}
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {isSoftPost
                  ? softPostMeta?.authorDisplayName || post.author
                  : hiveProfile?.displayName || post.author}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>@{post.author}</span>
                <span>•</span>
                <span className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  {formatDate(new Date(post.created))}
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  {formatReadTime(Math.ceil(post.body.length / 1000))}
                </span>
                {isSoftPost && (
                  <>
                    <span>•</span>
                    <span className="text-muted-foreground">Community Post</span>
                  </>
                )}
              </div>
              {post.sportCategory && (
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-accent/20 px-2 py-1 text-xs text-accent">
                    {post.sportCategory}
                  </span>
                </div>
              )}
              {!isSoftPost && pendingPayout > 0 && (
                <div className="mt-2">
                  <span className="text-sm font-medium text-accent">
                    💰 {formatAsset(pendingPayout, 'HIVE', 3)} pending
                  </span>
                </div>
              )}
            </div>
          </div>

          <h1 className="mb-6 text-3xl font-bold">{post.title}</h1>
        </div>

        {/* Post Content */}
        <div className="prose prose-lg mb-8 max-w-none">
          <div
            dangerouslySetInnerHTML={{
              __html: proxyImagesInContent(sanitizePostContent(post.body)),
            }}
          />
        </div>

        {/* Post Footer */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Voting/Like Section */}
              {isSoftPost && softPostMeta ? (
                <SoftLikeButton
                  targetType="post"
                  targetId={softPostMeta.id}
                  initialLikeCount={post.net_votes || 0}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <StarVoteButton
                    author={post.author}
                    permlink={post.permlink}
                    voteCount={post.net_votes || 0}
                    onVoteSuccess={handleVoteSuccess}
                    onVoteError={handleVoteError}
                  />
                  <span className="text-sm text-gray-600">{post.net_votes || 0} votes</span>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={handleComment}
                className="flex items-center space-x-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{isSoftPost ? 'Comments' : `${post.children || 0} comments`}</span>
              </Button>

              <Button
                variant="ghost"
                onClick={handleBookmark}
                className={`flex items-center space-x-2 ${
                  post && isBookmarked(post) ? 'text-yellow-500' : ''
                }`}
              >
                <Bookmark
                  className={`h-4 w-4 ${post && isBookmarked(post) ? 'fill-current' : ''}`}
                />
                <span>{post && isBookmarked(post) ? 'Bookmarked' : 'Bookmark'}</span>
              </Button>

              <Button variant="ghost" onClick={handleShare} className="flex items-center space-x-2">
                <Share className="h-4 w-4" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
