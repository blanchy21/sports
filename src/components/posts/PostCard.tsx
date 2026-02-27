'use client';

import React from 'react';
import Image from 'next/image';
import { MessageCircle, Bookmark, MapPin, Repeat2, Users } from 'lucide-react';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { StarVoteButton } from '@/components/voting/StarVoteButton';
import { SoftLikeButton } from '@/components/voting/SoftLikeButton';
import { cn, formatDate, formatReadTime } from '@/lib/utils/client';
import { calculatePendingPayout, formatAsset } from '@/lib/utils/hive';
import { useToast, toast } from '@/components/core/Toast';
import { useUserProfileCard } from '@/lib/react-query/queries/useUserProfile';
import { useModal } from '@/components/modals/ModalProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useBookmarks } from '@/hooks/useBookmarks';
import { usePremiumTier } from '@/lib/premium/hooks';
import { PremiumBadge } from '@/components/medals';
import { RoleBadge } from '@/components/user/RoleBadge';
// HiveUpgradePrompt no longer needed - soft users can now interact with all content
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
  /** Mark images as priority (eager) loading for above-the-fold cards */
  priority?: boolean;
}

// Extract the first image URL from post body (markdown or HTML img tags)
const extractFirstImageUrl = (body: string, jsonMetadata?: string): string | null => {
  // 1. Markdown image: ![alt](url)
  const mdMatch = body.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch) return mdMatch[1];

  // 2. HTML img tag: <img src="url" /> or <img src='url' />
  const htmlMatch = body.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch) return htmlMatch[1];

  // 3. Fallback: json_metadata.image array (most Hive front-ends populate this)
  if (jsonMetadata) {
    try {
      const meta = JSON.parse(jsonMetadata);
      if (Array.isArray(meta.image) && meta.image.length > 0 && typeof meta.image[0] === 'string') {
        return meta.image[0];
      }
    } catch {
      /* ignore malformed metadata */
    }
  }

  return null;
};

const PostCardComponent: React.FC<PostCardProps> = ({ post, className, priority = false }) => {
  const [isReblogging, setIsReblogging] = React.useState(false);
  const { addToast } = useToast();
  const { openModal } = useModal();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const { authType, hiveUser } = useAuth();
  const { broadcast } = useBroadcast();

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
  const { profile: hiveProfile, isLoading: isProfileLoading } = useUserProfileCard(
    isHivePost ? authorUsername : null
  );

  // Fetch premium tier for the author
  const { tier: authorPremiumTier } = usePremiumTier(authorUsername);

  // Helper functions to get author data (combining fetched profile with post data)
  // Safety net: mask emails that may have leaked into authorUsername from older posts
  const getAuthorName = () => {
    if (authorUsername.includes('@')) {
      return authorUsername.split('@')[0];
    }
    return authorUsername;
  };

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
      // Both Hive and soft users can comment (soft users post via API)
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

  const handleReblog = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReblogging || !hiveUser?.username) return;
    setIsReblogging(true);
    try {
      const { reblogPost } = await import('@/lib/hive-workerbee/social');
      const result = await reblogPost(authorUsername, postPermlink, hiveUser.username, broadcast);
      if (result.success) {
        addToast(toast.success('Reposted!', 'Reposted to your blog!'));
      } else {
        addToast(toast.error('Reblog Failed', result.error || 'Something went wrong'));
      }
    } catch {
      addToast(toast.error('Reblog Failed', 'Something went wrong'));
    } finally {
      setIsReblogging(false);
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
      <div className="border-b p-3 sm:p-4">
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
            <div className="flex items-center gap-x-2 overflow-hidden">
              <span
                className="shrink-0 cursor-pointer text-sm font-medium hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/user/${getAuthorName()}`;
                }}
              >
                @{getAuthorName()}
              </span>
              <RoleBadge username={getAuthorName()} />
              {authorPremiumTier && (
                <PremiumBadge tier={authorPremiumTier} size="sm" showLabel={false} />
              )}
              <span className="shrink-0 text-muted-foreground">•</span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {formatDate(createdAt)}
              </span>
              <span className="shrink-0 text-muted-foreground">•</span>
              <span className="truncate text-sm text-muted-foreground">
                {formatReadTime(readTime)}
              </span>
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
        className="cursor-pointer space-y-3 p-3 sm:p-4"
        onClick={() => {
          window.location.href = postUrl;
        }}
      >
        {(() => {
          // For Hive posts, extract image from body or metadata
          if (isHivePost) {
            const imageUrl = extractFirstImageUrl(post.body, post.json_metadata);
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
                    loading={priority ? 'eager' : 'lazy'}
                    priority={priority}
                    unoptimized // User-generated images can reference any domain
                  />
                </div>
              );
            }
          } else if (post.featuredImage) {
            const needsProxy = shouldProxyImage(post.featuredImage);
            const imgSrc = needsProxy ? getProxyImageUrl(post.featuredImage) : post.featuredImage;
            return (
              <div className="relative aspect-video w-full overflow-hidden rounded-md">
                <Image
                  src={imgSrc}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-200 hover:scale-105"
                  loading={priority ? 'eager' : 'lazy'}
                  priority={priority}
                  unoptimized
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
      <div className="border-t bg-muted/30 px-3 py-2 sm:px-4 sm:py-3">
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
                  className="flex items-center space-x-1 text-muted-foreground transition-colors hover:text-primary"
                  title="View voters"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{voteCount}</span>
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

            {isActualHivePost && authType === 'hive' && hiveUser?.username !== authorUsername && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReblog}
                disabled={isReblogging}
                className="flex items-center space-x-1 text-muted-foreground hover:text-green-500"
              >
                <Repeat2 className={cn('h-4 w-4', isReblogging && 'animate-spin')} />
              </Button>
            )}
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
    </article>
  );
};

/**
 * Custom comparison function for PostCard memoization.
 * Compares the essential properties that affect rendering,
 * avoiding unnecessary re-renders when the post object reference changes
 * but the content remains the same.
 */
function arePostsEqual(prevProps: PostCardProps, nextProps: PostCardProps): boolean {
  const prevPost = prevProps.post;
  const nextPost = nextProps.post;

  // Compare unique identifiers
  if (getPostAuthor(prevPost) !== getPostAuthor(nextPost)) return false;
  if (getPostPermlink(prevPost) !== getPostPermlink(nextPost)) return false;

  // Compare properties that affect visual rendering
  if (prevPost.title !== nextPost.title) return false;
  if (getPostVoteCount(prevPost) !== getPostVoteCount(nextPost)) return false;
  if (getPostCommentCount(prevPost) !== getPostCommentCount(nextPost)) return false;

  // Compare className prop
  if (prevProps.className !== nextProps.className) return false;

  return true;
}

// Memoize with custom comparison to prevent unnecessary re-renders in lists
export const PostCard = React.memo(PostCardComponent, arePostsEqual);
