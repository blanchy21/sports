'use client';

import React from 'react';
import Image from 'next/image';
import { MessageCircle, Bookmark, MapPin } from 'lucide-react';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { StarVoteButton } from '@/components/voting/StarVoteButton';
import { SoftLikeButton } from '@/components/voting/SoftLikeButton';
import { cn, formatDate, formatReadTime } from '@/lib/utils/client';
import { calculatePendingPayout, formatAsset } from '@/lib/utils/hive';
import { useToast, toast } from '@/components/core/Toast';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { useModal } from '@/components/modals/ModalProvider';
import { useBookmarks } from '@/hooks/useBookmarks';
import { usePremiumTier } from '@/lib/premium/hooks';
import { PremiumBadge } from '@/components/medals';
import { HiveUpgradePrompt, useHiveUpgradePrompt } from '@/components/upgrade/HiveUpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import { getProxyImageUrl, shouldProxyImage } from '@/lib/utils/image-proxy';
import {
  isSportsblockPost,
  isSoftPost as isSoftPostGuard,
  isHivePost as isHivePostGuard,
  getPostAuthor,
  getPostPermlink,
  getPostVoteCount,
  getPostCommentCount,
  getPostSportCategory,
  getPostUrl,
  getPostReadTime,
  getPostCreatedAt,
  getSoftPostId,
  getAuthorAvatar as getLegacyAuthorAvatar,
  getAuthorDisplayName as getLegacyAuthorDisplayName,
  type AnyPost,
} from '@/lib/utils/post-helpers';

interface PostCardProps {
  post: AnyPost;
  className?: string;
}

// Utility function to extract the first image URL from markdown content
const extractFirstImageUrl = (markdown: string): string | null => {
  const imageRegex = /!\[.*?\]\((.*?)\)/;
  const match = markdown.match(imageRegex);
  return match ? match[1] : null;
};

const PostCardComponent: React.FC<PostCardProps> = ({ post, className }) => {
  const { addToast } = useToast();
  const { openModal } = useModal();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const { isAuthenticated, authType } = useAuth();
  const { isPromptOpen, promptAction, showPromptIfNeeded, closePrompt } = useHiveUpgradePrompt();

  // Use type-safe helpers
  const isHivePost = isSportsblockPost(post);
  const isSoftPost = isSoftPostGuard(post);
  const isActualHivePost = isHivePostGuard(post);

  // Get post data using helpers
  const authorUsername = getPostAuthor(post);
  const postPermlink = getPostPermlink(post);
  const softPostId = getSoftPostId(post);
  const voteCount = getPostVoteCount(post);
  const commentCount = getPostCommentCount(post);
  const sportCategory = getPostSportCategory(post);
  const postUrl = getPostUrl(post);
  const readTime = getPostReadTime(post);
  const createdAt = getPostCreatedAt(post);

  // Calculate pending payout for actual Hive posts
  const pendingPayout =
    isActualHivePost && isSportsblockPost(post) ? calculatePendingPayout(post) : 0;

  // Fetch Hive user profile if it's a Hive post
  const { profile: hiveProfile, isLoading: isProfileLoading } = useUserProfile(
    isHivePost ? authorUsername : null
  );

  // Fetch premium tier for the author
  const { tier: authorPremiumTier } = usePremiumTier(authorUsername);

  // Helper functions to get author data (combining fetched profile with post data)
  const getAuthorName = () => authorUsername;

  const getAuthorAvatar = () => {
    if (isHivePost) {
      return hiveProfile?.avatar;
    }
    return getLegacyAuthorAvatar(post);
  };

  const getAuthorDisplayName = () => {
    if (isHivePost) {
      return hiveProfile?.displayName || authorUsername;
    }
    return getLegacyAuthorDisplayName(post);
  };

  const handleVoteSuccess = () => {
    addToast(toast.success('Vote Cast!', 'Your vote has been recorded on the blockchain.'));
  };

  const handleVoteError = (error: string) => {
    addToast(toast.error('Vote Failed', error));
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the post click
    toggleBookmark(post);
  };

  const handleComment = () => {
    if (isSoftPost) {
      // Soft posts use the soft comments modal
      openModal('softComments', {
        postId: softPostId || postPermlink,
        permlink: postPermlink,
        author: authorUsername,
      });
    } else if (isActualHivePost) {
      // Check if soft user is trying to comment on Hive post
      if (isAuthenticated && authType === 'soft') {
        showPromptIfNeeded('comment on');
        return;
      }
      // Hive posts use the blockchain comments modal
      openModal('comments', {
        author: authorUsername,
        permlink: postPermlink,
      });
    }
    // Other non-Hive posts don't support commenting yet
  };

  const handleUpvoteList = () => {
    // Only Hive posts have upvote lists (soft posts just show like count)
    if (isActualHivePost) {
      openModal('upvoteList', {
        author: authorUsername,
        permlink: postPermlink,
        voteCount: voteCount,
      });
    }
  };

  const handleUserProfile = (username: string) => {
    window.location.href = `/user/${username}`;
  };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md',
        className
      )}
    >
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center space-x-3">
          <button onClick={() => handleUserProfile(getAuthorName())}>
            <Avatar
              src={getAuthorAvatar()}
              fallback={getAuthorName()}
              alt={getAuthorDisplayName()}
              size="sm"
              className={
                isProfileLoading
                  ? 'animate-pulse'
                  : 'cursor-pointer transition-opacity hover:opacity-80'
              }
            />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span
                className="cursor-pointer text-sm font-medium hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/user/${getAuthorName()}`;
                }}
              >
                @{getAuthorName()}
              </span>
              {authorPremiumTier && (
                <PremiumBadge tier={authorPremiumTier} size="sm" showLabel={false} />
              )}
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{formatDate(createdAt)}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{formatReadTime(readTime)}</span>
            </div>
            {sportCategory && (
              <div className="mt-1 flex items-center space-x-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{sportCategory}</span>
              </div>
            )}
            {isActualHivePost && pendingPayout > 0 && (
              <div className="mt-1 flex items-center space-x-1">
                <span className="text-xs font-medium text-accent">
                  💰 {formatAsset(pendingPayout, 'HIVE', 3)} pending
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="cursor-pointer space-y-3 p-4"
        onClick={() => {
          window.location.href = postUrl;
        }}
      >
        {(() => {
          // For Hive posts, extract image from markdown body
          if (isHivePost) {
            const imageUrl = extractFirstImageUrl(post.body);
            if (imageUrl) {
              // Use proxy URL if needed to avoid CORS issues
              const finalImageUrl = shouldProxyImage(imageUrl)
                ? getProxyImageUrl(imageUrl)
                : imageUrl;
              return (
                <div className="relative aspect-video w-full overflow-hidden rounded-md">
                  <Image
                    src={finalImageUrl}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-200 hover:scale-105"
                    loading="lazy"
                    unoptimized={shouldProxyImage(imageUrl)} // Disable optimization for proxied images
                  />
                </div>
              );
            }
          } else if (post.featuredImage) {
            return (
              <div className="relative aspect-video w-full overflow-hidden rounded-md">
                <Image
                  src={post.featuredImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-200 hover:scale-105"
                  loading="lazy"
                />
              </div>
            );
          }
          return null;
        })()}

        <div>
          <h2 className="line-clamp-2 text-lg font-semibold transition-colors hover:text-primary">
            {post.title}
          </h2>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                +{post.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Voting/Like Section */}
            {isSoftPost ? (
              // Soft posts use the heart-based like system
              <SoftLikeButton
                targetType="post"
                targetId={softPostId || postPermlink}
                initialLikeCount={voteCount}
                onLikeSuccess={(liked, count) => {
                  addToast(
                    toast.success(liked ? 'Liked!' : 'Unliked', `Post now has ${count} likes`)
                  );
                }}
                onLikeError={(error) => {
                  addToast(toast.error('Like Failed', error));
                }}
              />
            ) : isActualHivePost ? (
              // Hive posts use the star-based voting system
              <div className="flex items-center space-x-1">
                <StarVoteButton
                  author={authorUsername}
                  permlink={postPermlink}
                  voteCount={voteCount}
                  onVoteSuccess={handleVoteSuccess}
                  onVoteError={handleVoteError}
                />
                <button
                  onClick={handleUpvoteList}
                  className="text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  ({voteCount})
                </button>
              </div>
            ) : (
              // Legacy non-Hive posts
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1 text-muted-foreground"
                disabled
              >
                <span>{voteCount}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="flex items-center space-x-1 text-muted-foreground hover:text-accent"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount}</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmark}
            className={`text-muted-foreground hover:text-yellow-500 ${
              isBookmarked(post) ? 'text-yellow-500' : ''
            }`}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked(post) ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Hive Upgrade Prompt for soft users trying to interact with Hive posts */}
      <HiveUpgradePrompt isOpen={isPromptOpen} onClose={closePrompt} action={promptAction} />
    </article>
  );
};

// Memoize to prevent unnecessary re-renders in lists
export const PostCard = React.memo(PostCardComponent);
