"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { StarVoteButton } from "@/components/StarVoteButton";
import { SoftLikeButton } from "@/components/SoftLikeButton";
import { ArrowLeft, MessageCircle, Bookmark, Share, Calendar, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
// fetchPost is now accessed via API route
import { SportsblockPost } from "@/lib/shared/types";
import { calculatePendingPayout, formatAsset } from "@/lib/shared/utils";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useModal } from "@/components/modals/ModalProvider";
import { useBookmarks } from "@/hooks/useBookmarks";
import { formatDate, formatReadTime } from "@/lib/utils";
import { proxyImagesInContent } from "@/lib/utils/image-proxy";
import { sanitizePostContent } from "@/lib/utils/sanitize";

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
          const result = await hiveResponse.json() as { success: boolean; post: SportsblockPost | null };
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
            // Convert soft post to SportsblockPost format
            const softPost = softResult.post;
            setPost({
              author: softPost.authorUsername,
              permlink: softPost.permlink,
              title: softPost.title,
              body: softPost.content,
              created: softPost.createdAt,
              last_update: softPost.updatedAt,
              category: softPost.sportCategory || 'general',
              tags: softPost.tags || [],
              sportCategory: softPost.sportCategory,
              json_metadata: JSON.stringify({ tags: softPost.tags }),
              net_votes: softPost.likeCount || 0,
              children: 0, // We'd need to fetch comments separately
              pending_payout_value: '0.000 HBD',
              curator_payout_value: '0.000 HBD',
              total_payout_value: '0.000 HBD',
              active_votes: [],
              // Soft post specific fields
              id: softPost.id,
              authorDisplayName: softPost.authorDisplayName,
              authorAvatar: softPost.authorAvatar,
              excerpt: softPost.excerpt,
            } as unknown as SportsblockPost);
            setIsSoftPost(true);
            return;
          }
        }

        setError("Post not found");
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Error loading post:', err);
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
    if (isSoftPost) {
      // Open soft comments modal for soft posts
      openModal('softComments', {
        postId: (post as unknown as { id: string }).id,
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
        <div className="max-w-4xl mx-auto p-6">
          <Loading text="Loading post..." skeleton skeletonLines={5} />
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
              src={isSoftPost ? (post as unknown as { authorAvatar?: string }).authorAvatar : hiveProfile?.avatar}
              fallback={post.author}
              alt={isSoftPost ? (post as unknown as { authorDisplayName?: string }).authorDisplayName || post.author : hiveProfile?.displayName || post.author}
              size="md"
              className={!isSoftPost && isProfileLoading ? "animate-pulse" : ""}
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {isSoftPost
                  ? (post as unknown as { authorDisplayName?: string }).authorDisplayName || post.author
                  : hiveProfile?.displayName || post.author}
              </h1>
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
                {isSoftPost && (
                  <>
                    <span>•</span>
                    <span className="text-muted-foreground">Community Post</span>
                  </>
                )}
              </div>
              {post.sportCategory && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent/20 text-accent">
                    {post.sportCategory}
                  </span>
                </div>
              )}
              {!isSoftPost && pendingPayout > 0 && (
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
              __html: proxyImagesInContent(sanitizePostContent(post.body))
            }}
          />
        </div>

        {/* Post Footer */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Voting/Like Section */}
              {isSoftPost ? (
                <SoftLikeButton
                  targetType="post"
                  targetId={(post as unknown as { id: string }).id}
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
                  <span className="text-sm text-gray-600">
                    {post.net_votes || 0} votes
                  </span>
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
