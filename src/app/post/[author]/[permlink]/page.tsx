"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { StarVoteButton } from "@/components/StarVoteButton";
import { ArrowLeft, MessageCircle, Bookmark, Share, Calendar, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchPost } from "@/lib/hive-workerbee/content";
import { SportsblockPost } from "@/lib/shared/types";
import { calculatePendingPayout, formatAsset } from "@/lib/shared/utils";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useModal } from "@/components/modals/ModalProvider";
import { useBookmarks } from "@/hooks/useBookmarks";
import { formatDate, formatReadTime } from "@/lib/utils";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { openModal } = useModal();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [post, setPost] = useState<SportsblockPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const author = params.author as string;
  const permlink = params.permlink as string;

  // Fetch Hive user profile
  const { profile: hiveProfile, isLoading: isProfileLoading } = useUserProfile(author);

  useEffect(() => {
    const loadPost = async () => {
      if (!author || !permlink) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const postData = await fetchPost(author, permlink);
        if (postData) {
          setPost(postData as unknown as SportsblockPost);
        } else {
          setError("Post not found");
        }
      } catch (err) {
        console.error('Error loading post:', err);
        setError('Failed to load post. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [author, permlink]);

  const handleVoteSuccess = () => {
    console.log("Vote successful");
    // Could trigger a refresh of the post data here
  };

  const handleVoteError = (error: string) => {
    console.error("Vote error:", error);
  };

  const handleComment = () => {
    openModal('comments', {
      author: post!.author,
      permlink: post!.permlink,
    });
  };

  const handleBookmark = () => {
    if (post) {
      toggleBookmark(post);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post!.title,
        text: post!.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !post) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Post Not Found</h1>
            <p className="text-gray-600 mb-6">{error || "The post you're looking for doesn't exist."}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const pendingPayout = calculatePendingPayout(post);

  // Debug: Log the post body to see what markdown content looks like
  console.log('Post body content:', post.body);
  console.log('Post title:', post.title);
  console.log('Post author:', post.author);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Post Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Avatar
              src={hiveProfile?.avatar}
              fallback={post.author}
              alt={hiveProfile?.displayName || post.author}
              size="md"
              className={isProfileLoading ? "animate-pulse" : ""}
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{hiveProfile?.displayName || post.author}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>@{post.author}</span>
                <span>•</span>
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(new Date(post.created))}
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatReadTime(Math.ceil(post.body.length / 1000))}
                </span>
              </div>
              {post.sportCategory && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent/20 text-accent">
                    {post.sportCategory}
                  </span>
                </div>
              )}
              {pendingPayout > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-accent font-medium">
                    💰 {formatAsset(pendingPayout, 'HIVE', 3)} pending
                  </span>
                </div>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-6">{post.title}</h1>
        </div>

        {/* Post Content */}
        <div className="prose prose-lg max-w-none mb-8">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: post.body
                .replace(/<center>/g, '<div class="text-center my-4">')
                .replace(/<\/center>/g, '</div>')
                .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-md my-4" />')
            }}
          />
        </div>

        {/* Post Footer */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Voting Section */}
              <div className="flex items-center space-x-2">
                <StarVoteButton
                  author={post.author}
                  permlink={post.permlink}
                  voteCount={post.net_votes || 0}
                  onVoteSuccess={handleVoteSuccess}
                  onVoteError={handleVoteError}
                />
                <span className="text-sm text-gray-600">
                  {post.net_votes || 0} votes
                </span>
              </div>
              
              <Button
                variant="ghost"
                onClick={handleComment}
                className="flex items-center space-x-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{post.children || 0} comments</span>
              </Button>

              <Button
                variant="ghost"
                onClick={handleBookmark}
                className={`flex items-center space-x-2 ${
                  post && isBookmarked(post) ? 'text-yellow-500' : ''
                }`}
              >
                <Bookmark className={`h-4 w-4 ${post && isBookmarked(post) ? 'fill-current' : ''}`} />
                <span>{post && isBookmarked(post) ? 'Bookmarked' : 'Bookmark'}</span>
              </Button>

              <Button
                variant="ghost"
                onClick={handleShare}
                className="flex items-center space-x-2"
              >
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
