'use client';

import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Avatar } from '@/components/core/Avatar';
import { Badge } from '@/components/core/Badge';
import { Button } from '@/components/core/Button';
import { CommentContent } from '@/components/comments/CommentContent';
import { CommentVoteButton } from '@/components/posts/CommentVoteButton';
import { useComments, useInvalidateComments } from '@/lib/react-query/queries/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, toast } from '@/components/core/Toast';
import { createCommentOperation } from '@/lib/hive-workerbee/wax-helpers';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { formatDate } from '@/lib/utils/client';
import { CommentToolbar } from '@/components/comments/CommentToolbar';
import { logger } from '@/lib/logger';
import { useBroadcast } from '@/hooks/useBroadcast';

interface InlineRepliesProps {
  author: string;
  permlink: string;
  source?: 'hive' | 'soft';
}

export function InlineReplies({ author, permlink, source }: InlineRepliesProps) {
  const { data: comments, isLoading, error } = useComments(author, permlink);
  const { user, hiveUser, touchSession } = useAuth();
  const { addToast } = useToast();
  const { invalidatePostComments } = useInvalidateComments();
  const { broadcast } = useBroadcast();
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!replyText.trim() || !user) return;

    setIsSubmitting(true);
    touchSession();

    try {
      if (hiveUser?.username && source !== 'soft') {
        const operation = createCommentOperation({
          author: hiveUser.username,
          body: replyText.trim(),
          parentAuthor: author,
          parentPermlink: permlink,
        });

        const result = await broadcast([['comment', operation]], 'posting');
        if (!result.success) {
          throw new Error(result.error || 'Failed to broadcast reply');
        }
      } else {
        const response = await fetch('/api/soft/comments', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId: `hive-${author}-${permlink}`,
            postPermlink: permlink,
            body: replyText.trim(),
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to post reply');
        }
      }

      addToast(toast.success('Reply Posted', 'Your reply has been posted.'));
      setReplyText('');
      invalidatePostComments(author, permlink);
    } catch (err) {
      logger.error('Error posting inline reply', 'InlineReplies', err);
      addToast(
        toast.error('Reply Failed', err instanceof Error ? err.message : 'Something went wrong')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t bg-muted/20 px-3 py-3 sm:px-4 sm:pl-[60px]">
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Failed to load replies.</p>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isNestedReply = comment.parent_author !== author;
            return (
              <div
                key={`${comment.author}-${comment.permlink}`}
                className={`flex gap-2 ${isNestedReply ? 'ml-6 border-l-2 border-muted-foreground/20 pl-3' : ''}`}
              >
                <Avatar
                  src={getHiveAvatarUrl(comment.author)}
                  fallback={comment.author}
                  alt={comment.author}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
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
                  </div>
                  <CommentContent body={comment.body} className="mt-0.5 text-sm" />
                  <div className="mt-1">
                    <CommentVoteButton
                      author={comment.author}
                      permlink={comment.permlink}
                      voteCount={comment.net_votes || 0}
                      onVoteSuccess={() => {
                        addToast(toast.success('Voted!', 'Your vote has been recorded.'));
                      }}
                      onVoteError={(err) => {
                        addToast(toast.error('Vote Failed', err));
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-2 text-center text-sm text-muted-foreground">
          No replies yet — be the first!
        </p>
      )}

      {/* Compose reply */}
      {user && (
        <div className="mt-3">
          <div className="flex gap-2">
            <Avatar
              src={user.username ? getHiveAvatarUrl(user.username) : undefined}
              fallback={user.username || 'U'}
              alt={user.username || 'You'}
              size="sm"
              className="hidden sm:flex"
            />
            <textarea
              ref={textareaRef}
              placeholder="Write a reply..."
              className="flex-1 resize-none rounded-lg border bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={1}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isSubmitting}
            />
            <Button
              size="sm"
              className="h-auto self-end px-3"
              onClick={handleSubmit}
              disabled={isSubmitting || !replyText.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="sm:pl-10">
            <CommentToolbar
              textareaRef={textareaRef}
              text={replyText}
              setText={setReplyText}
              disabled={isSubmitting}
              username={user.username}
            />
          </div>
        </div>
      )}
    </div>
  );
}
