"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { VoteButton } from "@/components/VoteButton";
import { ArrowLeft, MessageCircle, Bookmark, Share, Calendar, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchPost } from "@/lib/hive-workerbee/content";
import { SportsblockPost } from "@/lib/hive-workerbee/content";
import { calculatePendingPayout, formatAsset } from "@/lib/shared/utils";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useModal } from "@/components/modals/ModalProvider";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { formatDate, formatReadTime } from "@/lib/utils";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { openModal } = useModal();
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
          setPost(postData);
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
    console.log("Bookmarking post:", `${post!.author}/${post!.permlink}`);
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
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {post.sportCategory}
                  </span>
                </div>
              )}
              {pendingPayout > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-green-600 font-medium">
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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) => (
                <Image
                  src={String(src || '')}
                  alt={String(alt || '')}
                  width={700}
                  height={400}
                  className="rounded-lg shadow-md my-4 max-w-full h-auto"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              ),
              p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
              h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">{children}</pre>
              ),
            }}
          >
            {post.body}
          </ReactMarkdown>
        </div>

        {/* Post Footer */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Voting Section */}
              <div className="flex items-center space-x-2">
                <VoteButton
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
                className="flex items-center space-x-2"
              >
                <Bookmark className="h-4 w-4" />
                <span>Bookmark</span>
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
