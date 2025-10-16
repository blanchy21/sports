"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Bookmark, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { VoteButton } from "@/components/VoteButton";
import { Post } from "@/types";
import { cn, formatDate, formatReadTime, truncateText } from "@/lib/utils";
import { calculatePendingPayout, formatAsset } from "@/lib/hive/utils";
import { SportsblockPost } from "@/lib/hive/types";
import { VoteResult } from "@/lib/hive/voting";
import { useToast, toast } from "@/components/ui/Toast";
import { useUserProfile } from "@/hooks/useUserProfile";

interface PostCardProps {
  post: Post | SportsblockPost;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({ post, className }) => {
  const { addToast } = useToast();
  const isHivePost = 'isSportsblockPost' in post;
  const pendingPayout = isHivePost ? calculatePendingPayout(post) : 0;

  // Get author username for Hive posts
  const authorUsername = isHivePost ? post.author : (typeof post.author === 'string' ? post.author : post.author.username);
  
  // Fetch Hive user profile if it's a Hive post
  const { profile: hiveProfile, isLoading: isProfileLoading } = useUserProfile(isHivePost ? authorUsername : null);

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

  const handleVoteSuccess = (result: VoteResult) => {
    console.log("Vote successful:", result);
    addToast(toast.success("Vote Cast!", "Your vote has been recorded on the blockchain."));
    // Could trigger a refresh of the post data here
  };

  const handleVoteError = (error: string) => {
    console.error("Vote error:", error);
    addToast(toast.error("Vote Failed", error));
  };

  const handleBookmark = () => {
    // TODO: Implement bookmark functionality
    console.log("Bookmarking post:", isHivePost ? `${post.author}/${post.permlink}` : post.id);
  };

  const handleComment = () => {
    // TODO: Implement comment functionality
    console.log("Commenting on post:", isHivePost ? `${post.author}/${post.permlink}` : post.id);
  };

  return (
    <article className={cn("bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <Link href={`/user/${getAuthorName()}`}>
            <Avatar
              src={getAuthorAvatar()}
              fallback={getAuthorName()}
              alt={getAuthorDisplayName()}
              size="sm"
              className={isProfileLoading ? "animate-pulse" : ""}
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Link 
                href={`/user/${getAuthorName()}`}
                className="text-sm font-medium hover:underline"
              >
                @{getAuthorName()}
              </Link>
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
                <span className="text-xs text-green-600 font-medium">
                  💰 {formatAsset(pendingPayout, 'HIVE', 3)} pending
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <Link href={isHivePost ? `/post/${post.author}/${post.permlink}` : `/post/${post.id}`}>
        <div className="p-4 space-y-3 cursor-pointer">
          {(isHivePost ? post.img_url : post.featuredImage) && (
            <div className="aspect-video w-full overflow-hidden rounded-md relative">
              <Image
                src={(isHivePost ? post.img_url : post.featuredImage)!}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover hover:scale-105 transition-transform duration-200"
              />
            </div>
          )}
          
          <div>
            <h2 className="text-lg font-semibold line-clamp-2 hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground text-sm mt-2 line-clamp-3">
              {truncateText(isHivePost ? post.body.substring(0, 150) : post.excerpt, 150)}
            </p>
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
      </Link>

      {/* Footer */}
      <div className="px-4 py-3 border-t bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Voting Section */}
            {isHivePost ? (
              <VoteButton
                author={post.author}
                permlink={post.permlink}
                voteCount={post.net_votes || 0}
                onVoteSuccess={handleVoteSuccess}
                onVoteError={handleVoteError}
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => console.log("Voting not available for non-Hive posts")}
                className="flex items-center space-x-1 text-muted-foreground hover:text-red-500"
                disabled
              >
                <span>{post.upvotes}</span>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="flex items-center space-x-1 text-muted-foreground hover:text-blue-500"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{isHivePost ? post.children : post.comments}</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmark}
            className="text-muted-foreground hover:text-yellow-500"
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
};
