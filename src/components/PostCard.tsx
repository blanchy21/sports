"use client";

import React from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Post } from "@/types";
import { cn, formatDate, formatReadTime, truncateText } from "@/lib/utils";

interface PostCardProps {
  post: Post;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({ post, className }) => {
  const handleUpvote = () => {
    // TODO: Implement upvote functionality
    console.log("Upvoting post:", post.id);
  };

  const handleBookmark = () => {
    // TODO: Implement bookmark functionality
    console.log("Bookmarking post:", post.id);
  };

  const handleComment = () => {
    // TODO: Implement comment functionality
    console.log("Commenting on post:", post.id);
  };

  return (
    <article className={cn("bg-card border rounded-lg overflow-hidden hover:shadow-md transition-shadow", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <Link href={`/user/${post.author.username}`}>
            <Avatar
              src={post.author.avatar}
              fallback={post.author.username}
              alt={post.author.displayName || post.author.username}
              size="sm"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Link 
                href={`/user/${post.author.username}`}
                className="text-sm font-medium hover:underline"
              >
                @{post.author.username}
              </Link>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(post.publishedAt || post.createdAt)}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {formatReadTime(post.readTime)}
              </span>
            </div>
            {post.sport && (
              <div className="flex items-center space-x-1 mt-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {post.sport.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <Link href={`/post/${post.id}`}>
        <div className="p-4 space-y-3 cursor-pointer">
          {post.featuredImage && (
            <div className="aspect-video w-full overflow-hidden rounded-md">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              />
            </div>
          )}
          
          <div>
            <h2 className="text-lg font-semibold line-clamp-2 hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground text-sm mt-2 line-clamp-3">
              {truncateText(post.excerpt, 150)}
            </p>
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUpvote}
              className="flex items-center space-x-1 text-muted-foreground hover:text-red-500"
            >
              <Heart className="h-4 w-4" />
              <span>{post.upvotes}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="flex items-center space-x-1 text-muted-foreground hover:text-blue-500"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments}</span>
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
