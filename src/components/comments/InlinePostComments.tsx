'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useComments, useInvalidateComments } from '@/lib/react-query/queries/useComments';
import { Button } from '@/components/core/Button';
import { Avatar } from '@/components/core/Avatar';
import { RoleBadge } from '@/components/user/RoleBadge';
import { Send, Reply, MessageCircle } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBroadcast } from '@/hooks/useBroadcast';
import { useToast, toast } from '@/components/core/Toast';
import { createCommentOperation } from '@/lib/hive-workerbee/shared';
import { CommentVoteButton } from '@/components/posts/CommentVoteButton';
import { CommentToolbar } from '@/components/comments/CommentToolbar';
import { CommentContent } from '@/components/comments/CommentContent';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { logger } from '@/lib/logger';
import { buildCommentTree, flattenCommentTree } from '@/lib/utils/comment-tree';
import type { CommentData } from '@/lib/utils/comment-tree';

interface InlinePostCommentsProps {
  author: string;
  permlink: string;
  isSoftPost?: boolean;
  softPostId?: string;
}

export function InlinePostComments({
  author,
  permlink,
  isSoftPost,
  softPostId,
}: InlinePostCommentsProps) {
  const { user, hiveUser, touchSession } = useAuth();
  const { addToast } = useToast();
  const { invalidatePostComments } = useInvalidateComments();
  const { broadcast } = useBroadcast();

  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    author: string;
    permlink: string;
    body: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: comments, isLoading, error } = useComments(author, permlink);

  const flatComments = useMemo(() => {
    if (!comments || comments.length === 0) return [];
    const tree = buildCommentTree(comments as CommentData[], author, permlink);
    return flattenCommentTree(tree, 3);
  }, [comments, author, permlink]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      addToast(toast.error('Comment Required', 'Please enter a comment'));
      return;
    }

    if (!user) {
      addToast(toast.error('Authentication Required', 'Please sign in to comment'));
      return;
    }

    setIsSubmitting(true);
    touchSession();

    try {
      if (hiveUser?.username && !isSoftPost) {
        const operation = createCommentOperation({
          author: hiveUser.username,
          body: commentText.trim(),
          parentAuthor: replyingTo ? replyingTo.author : author,
          parentPermlink: replyingTo ? replyingTo.permlink : permlink,
        });

        const result = await broadcast([['comment', operation]], 'posting');

        if (!result.success) {
          throw new Error(result.error || 'Failed to broadcast comment');
        }

        addToast(toast.success('Success', 'Comment posted successfully!'));
      } else {
        const postId = isSoftPost && softPostId ? softPostId : `hive-${author}-${permlink}`;
        const response = await fetch('/api/soft/comments', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId,
            postPermlink: permlink,
            parentCommentId: replyingTo?.permlink,
            body: commentText.trim(),
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || data.message || 'Failed to post comment');
        }

        addToast(toast.success('Success', 'Comment posted!'));
      }

      setCommentText('');
      setReplyingTo(null);
      invalidatePostComments(author, permlink);
    } catch (err) {
      logger.error('Error posting comment', 'InlinePostComments', err);
      addToast(
        toast.error(
          'Comment Failed',
          err instanceof Error ? err.message : 'Failed to post comment. Please try again.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const focusComposer = () => {
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className="border-t pt-6">
      {/* Section header */}
      <div className="mb-6 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">
          Comments
          {comments && comments.length > 0 && (
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </h2>
      </div>

      {/* Comment composer at top */}
      {user ? (
        <div className="mb-8">
          {/* Reply indicator */}
          {replyingTo && (
            <div className="mb-3 rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-start gap-3">
                <Avatar
                  src={getHiveAvatarUrl(replyingTo.author)}
                  fallback={replyingTo.author[0]}
                  alt={replyingTo.author}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">@{replyingTo.author}</span>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {replyingTo.body}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Avatar
              src={user.username ? getHiveAvatarUrl(user.username) : undefined}
              fallback={user.username || 'U'}
              alt={user.username || 'You'}
              size="sm"
              className="mt-1 hidden sm:flex"
            />
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                placeholder={
                  replyingTo ? `Reply to @${replyingTo.author}...` : 'Write a comment...'
                }
                className="w-full resize-none rounded-lg border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary sm:text-base"
                rows={3}
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
              <div className="flex items-end justify-between">
                <CommentToolbar
                  textareaRef={textareaRef}
                  text={commentText}
                  setText={setCommentText}
                  disabled={isSubmitting}
                  username={user.username}
                />
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !commentText.trim()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Posting...' : replyingTo ? 'Reply' : 'Comment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-lg bg-muted/50 py-4 text-center">
          <p className="text-sm text-muted-foreground">Sign in to comment on this post.</p>
        </div>
      )}

      {/* Comment list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex animate-pulse space-x-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="mb-2 h-4 w-1/4 rounded bg-muted" />
                <div className="mb-1 h-4 w-full rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">Failed to load comments. Please try again later.</p>
        </div>
      ) : flatComments.length > 0 ? (
        <div className="space-y-4">
          {flatComments.map(({ node, depth, parentAuthor }) => {
            const comment = node.comment;
            return (
              <div
                key={`${comment.author}-${comment.permlink}`}
                className={cn(
                  'flex space-x-3',
                  depth === 1 && 'ml-8 border-l-2 border-border pl-4',
                  depth === 2 && 'ml-14 border-l-2 border-border/60 pl-4',
                  depth >= 3 && 'ml-18 border-l-2 border-border/40 pl-4'
                )}
              >
                <Avatar
                  src={getHiveAvatarUrl(comment.author)}
                  fallback={comment.author}
                  alt={comment.author}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium">@{comment.author}</span>
                    <RoleBadge username={comment.author} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(comment.created))}
                    </span>
                    {depth > 0 && parentAuthor && (
                      <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">
                        Reply to @{parentAuthor}
                      </span>
                    )}
                  </div>
                  <CommentContent body={comment.body} />
                  <div className="mt-2 flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setReplyingTo({
                          author: comment.author,
                          permlink: comment.permlink,
                          body: comment.body,
                        });
                        focusComposer();
                      }}
                    >
                      <Reply className="mr-1 h-3 w-3" />
                      Reply
                    </Button>
                    {!isSoftPost && (
                      <CommentVoteButton
                        author={comment.author}
                        permlink={comment.permlink}
                        voteCount={comment.net_votes || 0}
                        onVoteSuccess={() => {
                          addToast(
                            toast.success(
                              'Comment Voted!',
                              'Your vote has been recorded on the blockchain.'
                            )
                          );
                        }}
                        onVoteError={(err) => {
                          addToast(toast.error('Vote Failed', err));
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      )}
    </section>
  );
}
