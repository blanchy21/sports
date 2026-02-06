'use client';

import React, { useState } from 'react';
import { useComments } from '@/lib/react-query/queries/useComments';
import { Button } from '@/components/core/Button';
import { Badge } from '@/components/core/Badge';
import { Avatar } from '@/components/core/Avatar';
import { MessageCircle, Send, Film } from 'lucide-react';
import { formatDate } from '@/lib/utils/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, toast } from '@/components/core/Toast';
import { createCommentOperation } from '@/lib/hive-workerbee/wax-helpers';
import { useInvalidateComments } from '@/lib/react-query/queries/useComments';
import { CommentVoteButton } from '@/components/posts/CommentVoteButton';
import { BaseModal } from '@/components/core/BaseModal';
import { GifPicker } from '@/components/gif/GifPicker';
import { CommentContent } from '@/components/comments/CommentContent';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, data }) => {
  const author = data?.author as string;
  const permlink = data?.permlink as string;
  const { user, hiveUser, authType } = useAuth();
  const { addToast } = useToast();
  const { invalidatePostComments } = useInvalidateComments();

  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  const handleGifSelect = (gifUrl: string) => {
    setCommentText((prev) => prev + `\n![gif](${gifUrl})\n`);
    setShowGifPicker(false);
  };

  const { data: comments, isLoading, error } = useComments(author || '', permlink || '');

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      addToast({
        title: 'Comment Required',
        description: 'Please enter a comment',
        type: 'error',
      });
      return;
    }

    if (!user) {
      addToast({
        title: 'Authentication Required',
        description: 'Please sign in to comment',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (hiveUser?.username) {
        // HIVE USER: Publish to blockchain via Keychain
        const operation = createCommentOperation({
          author: hiveUser.username,
          body: commentText.trim(),
          parentAuthor: author,
          parentPermlink: permlink,
        });

        const { aioha } = await import('@/lib/aioha/config');

        const aiohaInstance = aioha as {
          signAndBroadcastTx?: (ops: unknown[], keyType: string) => Promise<unknown>;
        } | null;

        if (!aiohaInstance || typeof aiohaInstance.signAndBroadcastTx !== 'function') {
          throw new Error('Hive authentication not available. Please reconnect.');
        }

        const result = await aiohaInstance.signAndBroadcastTx([['comment', operation]], 'posting');

        const broadcast = result as { success?: boolean; error?: string } | null;
        if (!result || broadcast?.success === false || broadcast?.error) {
          throw new Error(broadcast?.error || 'Failed to broadcast comment');
        }

        addToast({
          title: 'Success',
          description: 'Comment posted successfully!',
          type: 'success',
        });
        setCommentText('');
        invalidatePostComments(author, permlink);
      } else {
        // SOFT USER: Publish to Firebase
        const response = await fetch('/api/soft/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({
            postId: `hive-${author}-${permlink}`,
            postPermlink: permlink,
            body: commentText.trim(),
          }),
        });

        const data = await response.json();

        if (data.success) {
          addToast({
            title: 'Success',
            description: 'Comment posted!',
            type: 'success',
          });
          setCommentText('');
          invalidatePostComments(author, permlink);
        } else {
          addToast({
            title: 'Comment Failed',
            description: data.error || data.message || 'Failed to post comment',
            type: 'error',
          });
        }
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      addToast({
        title: 'Comment Failed',
        description: 'Failed to post comment. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>Comments</span>
          {comments && <span className="text-sm text-muted-foreground">({comments.length})</span>}
        </div>
      }
      size="xl"
      className="flex max-h-[80vh] flex-col"
    >
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex animate-pulse space-x-3">
                <div className="h-8 w-8 rounded-full bg-gray-300"></div>
                <div className="flex-1">
                  <div className="mb-2 h-4 w-1/4 rounded bg-gray-300"></div>
                  <div className="mb-1 h-4 w-full rounded bg-gray-300"></div>
                  <div className="h-4 w-3/4 rounded bg-gray-300"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">⚠️</div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Error Loading Comments
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Failed to load comments. Please try again later.
            </p>
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isNestedReply = comment.parent_author !== author;
              return (
                <div
                  key={`${comment.author}-${comment.permlink}`}
                  className={`flex space-x-3 ${isNestedReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}
                >
                  <Avatar
                    src={`https://images.hive.blog/u/${comment.author}/avatar`}
                    fallback={comment.author}
                    alt={comment.author}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center space-x-2">
                      <span className="text-sm font-medium">@{comment.author}</span>
                      {comment.source === 'soft' ? (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          Off Chain
                        </Badge>
                      ) : (
                        <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                          Hive
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(new Date(comment.created))}
                      </span>
                      {isNestedReply && (
                        <span className="rounded bg-accent/20 px-2 py-1 text-xs text-accent">
                          Reply to @{comment.parent_author}
                        </span>
                      )}
                    </div>
                    <CommentContent body={comment.body} />
                    <div className="mt-2 flex items-center space-x-4">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        Reply
                      </Button>
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
                        onVoteError={(error) => {
                          addToast(toast.error('Vote Failed', error));
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">💬</div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              No Comments Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Be the first to comment on this post!
            </p>
          </div>
        )}
      </div>

      {/* Comment Input */}
      <div className="border-t p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 gap-3">
            <Avatar
              src={
                user?.username ? `https://images.hive.blog/u/${user.username}/avatar` : undefined
              }
              fallback={user?.username || 'U'}
              alt={user?.username || 'You'}
              size="sm"
              className="hidden sm:flex"
            />
            <div className="flex-1">
              <textarea
                placeholder="Write a comment..."
                className="w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-base"
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
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Posting...' : 'Comment'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};
