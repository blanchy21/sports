'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/core/Button';
import { Badge } from '@/components/core/Badge';
import { Avatar } from '@/components/core/Avatar';
import { MessageCircle, Send, Loader2, Reply, Film } from 'lucide-react';
import { formatDate } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, toast } from '@/components/core/Toast';
import { BaseModal } from '@/components/core/BaseModal';
import { SoftLikeButtonCompact } from '@/components/voting/SoftLikeButton';
import { SoftComment } from '@/app/api/soft/comments/route';
import { GifPicker } from '@/components/gif/GifPicker';
import { CommentContent } from '@/components/comments/CommentContent';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { logger } from '@/lib/logger';

interface SoftCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const SoftCommentsModal: React.FC<SoftCommentsModalProps> = ({ isOpen, onClose, data }) => {
  const postId = data?.postId as string;
  const postPermlink = data?.permlink as string;
  const { user, isAuthenticated, touchSession } = useAuth();
  const { addToast } = useToast();

  const [comments, setComments] = useState<SoftComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<SoftComment | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);

  const handleGifSelect = (gifUrl: string) => {
    setCommentText((prev) => prev + `\n![gif](${gifUrl})\n`);
    setShowGifPicker(false);
  };

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
      addToast(toast.error('Comment Required', 'Please enter a comment'));
      return;
    }

    if (!isAuthenticated) {
      addToast(toast.error('Authentication Required', 'Please sign in to comment'));
      return;
    }

    setIsSubmitting(true);
    touchSession();

    try {
      if (!user?.id) {
        addToast(toast.error('Authentication Error', 'User ID not available'));
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
          addToast(
            toast.error(
              'Comment Limit Reached',
              data.message || 'Upgrade to Hive for unlimited comments'
            )
          );
        } else {
          throw new Error(data.error || 'Failed to post comment');
        }
        return;
      }

      addToast(toast.success('Success', 'Comment posted successfully!'));
      setCommentText('');
      setReplyingTo(null);

      // Add the new comment to the list
      setComments((prev) => [...prev, data.comment]);
    } catch (err) {
      logger.error('Error posting comment', 'SoftCommentsModal', err);
      addToast(
        toast.error('Comment Failed', err instanceof Error ? err.message : 'Failed to post comment')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      if (!user?.id) {
        addToast(toast.error('Authentication Error', 'User ID not available'));
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

      addToast(toast.success('Deleted', 'Comment deleted successfully'));

      // Update the comment in the list
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, body: '[deleted]', isDeleted: true } : c))
      );
    } catch (err) {
      addToast(
        toast.error(
          'Delete Failed',
          err instanceof Error ? err.message : 'Failed to delete comment'
        )
      );
    }
  };

  // Group comments by parent for threading
  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const repliesByParent = comments.reduce(
    (acc, comment) => {
      if (comment.parentCommentId) {
        if (!acc[comment.parentCommentId]) {
          acc[comment.parentCommentId] = [];
        }
        acc[comment.parentCommentId].push(comment);
      }
      return acc;
    },
    {} as Record<string, SoftComment[]>
  );

  const renderComment = (comment: SoftComment, isReply = false) => {
    const isOwner = user?.id === comment.authorId;
    const replies = repliesByParent[comment.id] || [];

    return (
      <div
        key={comment.id}
        className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4 dark:border-gray-700' : ''}`}
      >
        <div className="flex space-x-3 py-3">
          <Avatar
            src={
              comment.isHiveUser ? getHiveAvatarUrl(comment.authorUsername) : comment.authorAvatar
            }
            fallback={comment.authorUsername[0]}
            alt={comment.authorUsername}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center space-x-2">
              <span className="text-sm font-medium">
                {comment.authorDisplayName || `@${comment.authorUsername}`}
              </span>
              <span className="text-xs text-muted-foreground">@{comment.authorUsername}</span>
              {comment.isHiveUser ? (
                <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                  Hive
                </Badge>
              ) : (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  Off Chain
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(new Date(comment.createdAt))}
              </span>
              {comment.updatedAt !== comment.createdAt && !comment.isDeleted && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {comment.isDeleted ? (
                <p className="whitespace-pre-wrap text-sm italic text-muted-foreground">
                  {comment.body}
                </p>
              ) : (
                <CommentContent body={comment.body} />
              )}
            </div>
            {!comment.isDeleted && (
              <div className="mt-2 flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setReplyingTo(comment)}
                >
                  <Reply className="mr-1 h-3 w-3" />
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
          <div className="space-y-1">{replies.map((reply) => renderComment(reply, true))}</div>
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
            <span className="text-sm text-muted-foreground">({comments.length})</span>
          )}
        </div>
      }
      size="xl"
      className="flex max-h-[80vh] flex-col"
    >
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">error</div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Error Loading Comments
            </h3>
            <p className="text-gray-500 dark:text-gray-400">{error}</p>
            <Button className="mt-4" onClick={fetchComments}>
              Try Again
            </Button>
          </div>
        ) : comments.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {topLevelComments.map((comment) => renderComment(comment))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">speech_bubble</div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
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
        <div className="flex items-center justify-between border-b border-t bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            Replying to <span className="font-medium">@{replyingTo.authorUsername}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Comment Input */}
      <div className="border-t p-4 sm:p-6">
        {isAuthenticated ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 gap-3">
              <Avatar
                src={
                  user?.isHiveAuth
                    ? getHiveAvatarUrl(user.hiveUsername || user.username)
                    : undefined
                }
                fallback={user?.username?.[0] || 'U'}
                alt={user?.username || 'You'}
                size="sm"
                className="hidden sm:flex"
              />
              <div className="flex-1">
                <textarea
                  placeholder={
                    replyingTo ? `Reply to @${replyingTo.authorUsername}...` : 'Write a comment...'
                  }
                  className="w-full resize-none rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-base"
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
                {/* GIF Button */}
                <div className="relative mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGifPicker(!showGifPicker)}
                    className="h-8 px-2 text-muted-foreground hover:text-primary"
                    title="Add GIF"
                  >
                    <Film className="mr-1 h-4 w-4" />
                    <span className="text-xs">GIF</span>
                  </Button>
                  <GifPicker
                    isOpen={showGifPicker}
                    onClose={() => setShowGifPicker(false)}
                    onSelect={handleGifSelect}
                    className="bottom-full left-0 mb-2"
                  />
                </div>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full self-stretch sm:w-auto sm:self-end"
              onClick={handleSubmitComment}
              disabled={isSubmitting || !commentText.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? 'Posting...' : replyingTo ? 'Reply' : 'Comment'}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 py-4 text-center">
            <p className="text-sm text-muted-foreground">Sign in to comment on this post.</p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
