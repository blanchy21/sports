"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { MessageCircle, Send, Loader2, Reply } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast, toast } from "@/components/ui/Toast";
import { BaseModal } from "@/components/ui/BaseModal";
import { SoftLikeButtonCompact } from "@/components/SoftLikeButton";
import { SoftComment } from "@/app/api/soft/comments/route";

interface SoftCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const SoftCommentsModal: React.FC<SoftCommentsModalProps> = ({ isOpen, onClose, data }) => {
  const postId = data?.postId as string;
  const postPermlink = data?.permlink as string;
  const { user, isAuthenticated, authType } = useAuth();
  const { addToast } = useToast();

  const [comments, setComments] = useState<SoftComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<SoftComment | null>(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!postId && !postPermlink) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (postId) params.set('postId', postId);
      if (postPermlink) params.set('postPermlink', postPermlink);

      const response = await fetch(`/api/soft/comments?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments');
      }

      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [postId, postPermlink]);

  // Fetch comments when modal opens
  useEffect(() => {
    if (isOpen && (postId || postPermlink)) {
      fetchComments();
    }
  }, [isOpen, postId, postPermlink, fetchComments]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      addToast(toast.error("Comment Required", "Please enter a comment"));
      return;
    }

    if (!isAuthenticated) {
      addToast(toast.error("Authentication Required", "Please sign in to comment"));
      return;
    }

    if (authType !== "soft") {
      addToast(toast.error("Soft Login Required", "Only email users can comment on soft posts. Hive users should use Hive posts."));
      return;
    }

    setIsSubmitting(true);

    try {
      if (!user?.id) {
        addToast(toast.error("Authentication Error", "User ID not available"));
        return;
      }

      const response = await fetch('/api/soft/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          postId: postId || `soft-${postPermlink}`,
          postPermlink: postPermlink || postId,
          parentCommentId: replyingTo?.id,
          body: commentText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgradeRequired) {
          addToast(toast.error("Comment Limit Reached", data.message || "Upgrade to Hive for unlimited comments"));
        } else {
          throw new Error(data.error || 'Failed to post comment');
        }
        return;
      }

      addToast(toast.success("Success", "Comment posted successfully!"));
      setCommentText("");
      setReplyingTo(null);

      // Add the new comment to the list
      setComments(prev => [...prev, data.comment]);
    } catch (err) {
      console.error("Error posting comment:", err);
      addToast(toast.error("Comment Failed", err instanceof Error ? err.message : "Failed to post comment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      if (!user?.id) {
        addToast(toast.error("Authentication Error", "User ID not available"));
        return;
      }

      const response = await fetch('/api/soft/comments', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ commentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete comment');
      }

      addToast(toast.success("Deleted", "Comment deleted successfully"));

      // Update the comment in the list
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, body: '[deleted]', isDeleted: true }
          : c
      ));
    } catch (err) {
      addToast(toast.error("Delete Failed", err instanceof Error ? err.message : "Failed to delete comment"));
    }
  };

  // Group comments by parent for threading
  const topLevelComments = comments.filter(c => !c.parentCommentId);
  const repliesByParent = comments.reduce((acc, comment) => {
    if (comment.parentCommentId) {
      if (!acc[comment.parentCommentId]) {
        acc[comment.parentCommentId] = [];
      }
      acc[comment.parentCommentId].push(comment);
    }
    return acc;
  }, {} as Record<string, SoftComment[]>);

  const renderComment = (comment: SoftComment, isReply = false) => {
    const isOwner = user?.id === comment.authorId;
    const replies = repliesByParent[comment.id] || [];

    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
        <div className="flex space-x-3 py-3">
          <Avatar
            src={comment.authorAvatar}
            fallback={comment.authorUsername[0]}
            alt={comment.authorUsername}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-sm">
                {comment.authorDisplayName || `@${comment.authorUsername}`}
              </span>
              <span className="text-xs text-muted-foreground">
                @{comment.authorUsername}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(new Date(comment.createdAt))}
              </span>
              {comment.updatedAt !== comment.createdAt && !comment.isDeleted && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>
            <div className="prose prose-sm max-w-none">
              <p className={`text-sm whitespace-pre-wrap ${comment.isDeleted ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                {comment.body}
              </p>
            </div>
            {!comment.isDeleted && (
              <div className="flex items-center space-x-4 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setReplyingTo(comment)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                <SoftLikeButtonCompact
                  targetType="comment"
                  targetId={comment.id}
                  initialLikeCount={comment.likeCount}
                />
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Render replies */}
        {replies.length > 0 && (
          <div className="space-y-1">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>Comments</span>
          {comments.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </div>
      }
      size="lg"
      className="max-h-[80vh] flex flex-col"
    >
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">error</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Comments
            </h3>
            <p className="text-gray-500 dark:text-gray-400">{error}</p>
            <Button className="mt-4" onClick={fetchComments}>
              Try Again
            </Button>
          </div>
        ) : comments.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {topLevelComments.map(comment => renderComment(comment))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">speech_bubble</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Comments Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Be the first to comment on this post!
            </p>
          </div>
        )}
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="border-t border-b px-4 py-2 bg-muted/50 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Replying to <span className="font-medium">@{replyingTo.authorUsername}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyingTo(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Comment Input */}
      <div className="border-t p-4 sm:p-6">
        {isAuthenticated && authType === 'soft' ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-3 flex-1">
              <Avatar
                fallback={user?.username?.[0] || "U"}
                alt={user?.username || "You"}
                size="sm"
                className="hidden sm:flex"
              />
              <div className="flex-1">
                <textarea
                  placeholder={replyingTo ? `Reply to @${replyingTo.authorUsername}...` : "Write a comment..."}
                  className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base bg-background"
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <Button
              size="sm"
              className="self-stretch sm:self-end w-full sm:w-auto"
              onClick={handleSubmitComment}
              disabled={isSubmitting || !commentText.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? "Posting..." : replyingTo ? "Reply" : "Comment"}
            </Button>
          </div>
        ) : isAuthenticated && authType === 'hive' ? (
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              This is a soft post. Hive users cannot comment on soft posts.
            </p>
            <p className="text-xs text-muted-foreground">
              Soft posts are stored on Sportsblock servers, not on the Hive blockchain.
            </p>
          </div>
        ) : (
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Sign in with email to comment on this post.
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
