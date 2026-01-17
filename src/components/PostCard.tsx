"use client";

import React from "react";
import Image from "next/image";
import { MessageCircle, Bookmark, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { StarVoteButton } from "@/components/StarVoteButton";
import { Post } from "@/types";
import { cn, formatDate, formatReadTime, truncateText } from "@/lib/utils";
import { calculatePendingPayout, formatAsset } from "@/lib/shared/utils";
import { SportsblockPost } from "@/lib/shared/types";
import { useToast, toast } from "@/components/ui/Toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useModal } from "@/components/modals/ModalProvider";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePremiumTier } from "@/lib/premium/hooks";
import { PremiumBadge } from "@/components/medals";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PostCardProps {
  post: Post | SportsblockPost;
  className?: string;
}

import { getProxyImageUrl, shouldProxyImage } from "@/lib/utils/image-proxy";

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
  const isHivePost = 'isSportsblockPost' in post;
  const pendingPayout = isHivePost ? calculatePendingPayout(post) : 0;

  // Get author username for Hive posts
  const authorUsername = isHivePost ? post.author : (typeof post.author === 'string' ? post.author : post.author.username);
  
  // Fetch Hive user profile if it's a Hive post
  const { profile: hiveProfile, isLoading: isProfileLoading } = useUserProfile(isHivePost ? authorUsername : null);

  // Fetch premium tier for the author
  const { tier: authorPremiumTier } = usePremiumTier(authorUsername);

  // Helper functions to get post data safely
  const getAuthorName = () => {
    if (isHivePost) {
      return post.author;
    }
    return typeof post.author === 'string' ? post.author : post.author.username;
  };

  const getAuthorAvatar = () => {
    if (isHivePost) {
      return hiveProfile?.avatar; // Use fetched Hive profile avatar
    }
    return typeof post.author === 'string' ? undefined : post.author.avatar;
  };

  const getAuthorDisplayName = () => {
    if (isHivePost) {
      return hiveProfile?.displayName || post.author; // Use fetched display name or fallback to username
    }
    return typeof post.author === 'string' ? post.author : (post.author.displayName || post.author.username);
  };

  const handleVoteSuccess = () => {
    addToast(toast.success("Vote Cast!", "Your vote has been recorded on the blockchain."));
  };

  const handleVoteError = (error: string) => {
    addToast(toast.error("Vote Failed", error));
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the post click
    toggleBookmark(post);
  };

  const handleComment = () => {
    if (isHivePost) {
      openModal('comments', {
        author: post.author,
        permlink: post.permlink,
      });
    }
    // Non-Hive posts don't support commenting yet
  };

  const handleUpvoteList = () => {
    if (isHivePost) {
      openModal('upvoteList', {
        author: post.author,
        permlink: post.permlink,
        voteCount: post.net_votes || 0,
      });
    }
  };

  const handleUserProfile = (username: string) => {
    window.location.href = `/user/${username}`;
  };

  return (
    <article className={cn("bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <button onClick={() => handleUserProfile(getAuthorName())}>
            <Avatar
              src={getAuthorAvatar()}
              fallback={getAuthorName()}
              alt={getAuthorDisplayName()}
              size="sm"
              className={isProfileLoading ? "animate-pulse" : "hover:opacity-80 transition-opacity cursor-pointer"}
            />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span
                className="text-sm font-medium hover:underline cursor-pointer"
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
              <span className="text-sm text-muted-foreground">
                {formatDate(isHivePost ? new Date(post.created) : (post.publishedAt || post.createdAt))}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {formatReadTime(isHivePost ? Math.ceil(post.body.length / 1000) : post.readTime)}
              </span>
            </div>
            {!isHivePost && post.sport && (
              <div className="flex items-center space-x-1 mt-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {post.sport.name}
                </span>
              </div>
            )}
            {isHivePost && post.sportCategory && (
              <div className="flex items-center space-x-1 mt-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {post.sportCategory}
                </span>
              </div>
            )}
            {isHivePost && pendingPayout > 0 && (
              <div className="flex items-center space-x-1 mt-1">
                <span className="text-xs text-accent font-medium">
                  💰 {formatAsset(pendingPayout, 'HIVE', 3)} pending
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div 
        className="p-4 space-y-3 cursor-pointer"
        onClick={() => {
          const url = isHivePost ? `/post/${post.author}/${post.permlink}` : `/post/${post.id}`;
          window.location.href = url;
        }}
      >
          {(() => {
            // For Hive posts, extract image from markdown body
            if (isHivePost) {
              const imageUrl = extractFirstImageUrl(post.body);
              if (imageUrl) {
                // Use proxy URL if needed to avoid CORS issues
                const finalImageUrl = shouldProxyImage(imageUrl) ? getProxyImageUrl(imageUrl) : imageUrl;
                return (
                  <div className="aspect-video w-full overflow-hidden rounded-md relative">
                    <Image
                      src={finalImageUrl}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover hover:scale-105 transition-transform duration-200"
                      priority
                      unoptimized={shouldProxyImage(imageUrl)} // Disable optimization for proxied images
                    />
                  </div>
                );
              }
            } else if (post.featuredImage) {
              return (
                <div className="aspect-video w-full overflow-hidden rounded-md relative">
                  <Image
                    src={post.featuredImage}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              );
            }
            return null;
          })()}
          
          <div>
            <h2 className="text-lg font-semibold line-clamp-2 hover:text-primary transition-colors">
              {post.title}
            </h2>
            <div className="text-muted-foreground text-sm mt-2 line-clamp-3">
              {isHivePost ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: () => null, // Hide images in preview
                    p: ({ children }) => <p className="text-muted-foreground text-sm">{children}</p>,
                    a: ({ children }) => <span className="text-muted-foreground text-sm">{children}</span>, // Convert links to spans
                  }}
                >
                  {truncateText(post.body, 200)}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {truncateText(post.excerpt, 150)}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
                >
                  #{tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                  +{post.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Voting Section */}
            {isHivePost ? (
              <div className="flex items-center space-x-1">
                <StarVoteButton
                  author={post.author}
                  permlink={post.permlink}
                  voteCount={post.net_votes || 0}
                  onVoteSuccess={handleVoteSuccess}
                  onVoteError={handleVoteError}
                />
                <button
                  onClick={handleUpvoteList}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  ({post.net_votes || 0})
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1 text-muted-foreground"
                disabled
              >
                <span>{post.upvotes}</span>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="flex items-center space-x-1 text-muted-foreground hover:text-accent"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{isHivePost ? post.children : post.comments}</span>
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
    </article>
  );
};

// Memoize to prevent unnecessary re-renders in lists
export const PostCard = React.memo(PostCardComponent);
