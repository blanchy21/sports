'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Send, Loader2, Reply, X } from 'lucide-react';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { RoleBadge } from '@/components/user/RoleBadge';
import { CommentContent } from '@/components/comments/CommentContent';
import { CommentVoteButton } from '@/components/posts/CommentVoteButton';
import { useComments, useInvalidateComments } from '@/lib/react-query/queries/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, toast } from '@/components/core/Toast';
import { createCommentOperation } from '@/lib/hive-workerbee/shared';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { formatDate } from '@/lib/utils/client';
import { CommentToolbar } from '@/components/comments/CommentToolbar';
import { logger } from '@/lib/logger';
import { useBroadcast } from '@/hooks/useBroadcast';
import { cn } from '@/lib/utils/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InlineRepliesProps {
  author: string;
  permlink: string;
  source?: 'hive' | 'soft';
}

interface ReplyTarget {
  author: string;
  permlink: string;
  source?: string;
}

interface CommentData {
  author: string;
  permlink: string;
  body: string;
  created: string;
  parent_author?: string;
  parent_permlink?: string;
  net_votes?: number;
  source?: string;
  parentCommentId?: string;
  [key: string]: unknown;
}

interface CommentNode {
  comment: CommentData;
  children: CommentNode[];
}

// ---------------------------------------------------------------------------
// Tree builder
// ---------------------------------------------------------------------------

function buildCommentTree(
  comments: CommentData[],
  sportsbiteAuthor: string,
  sportsbitePermlink: string
): CommentNode[] {
  const byPermlink = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // Create all nodes first
  for (const comment of comments) {
    byPermlink.set(comment.permlink, { comment, children: [] });
  }

  // Link children to parents
  for (const comment of comments) {
    const node = byPermlink.get(comment.permlink)!;
    let parentKey: string | undefined;

    if (comment.source === 'soft' && comment.parentCommentId) {
      // Soft comment with a parent — parentCommentId maps to another comment's permlink
      parentKey = comment.parentCommentId;
    } else if (
      comment.parent_author &&
      comment.parent_permlink &&
      !(
        comment.parent_author === sportsbiteAuthor && comment.parent_permlink === sportsbitePermlink
      )
    ) {
      // Hive comment whose parent is another comment (not the sportsbite itself)
      parentKey = comment.parent_permlink;
    }

    const parentNode = parentKey ? byPermlink.get(parentKey) : undefined;
    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Walk the tree into a flat list with depth capped at 2. */
function flattenCommentTree(
  tree: CommentNode[]
): { node: CommentNode; depth: number; parentAuthor?: string }[] {
  const result: { node: CommentNode; depth: number; parentAuthor?: string }[] = [];

  function walk(nodes: CommentNode[], depth: number, parentAuth?: string) {
    for (const n of nodes) {
      result.push({ node: n, depth, parentAuthor: parentAuth });
      walk(n.children, Math.min(depth + 1, 2), n.comment.author);
    }
  }

  walk(tree, 0);
  return result;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_REPLY_CHARS = 280;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InlineReplies({ author, permlink, source }: InlineRepliesProps) {
  const { data: comments, isLoading, error } = useComments(author, permlink);
  const { user, hiveUser, touchSession } = useAuth();
  const { addToast } = useToast();
  const { invalidatePostComments } = useInvalidateComments();
  const { broadcast } = useBroadcast();
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Character counter
  const charCount = replyText.length;
  const remaining = MAX_REPLY_CHARS - charCount;
  const isOverLimit = remaining < 0;

  // Build comment tree and flatten for rendering
  const flatComments = useMemo(() => {
    if (!comments || comments.length === 0) return [];
    const tree = buildCommentTree(comments as CommentData[], author, permlink);
    return flattenCommentTree(tree);
  }, [comments, author, permlink]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleReplyTo = (comment: CommentData) => {
    setReplyingTo({
      author: comment.author,
      permlink: comment.permlink,
      source: comment.source,
    });
    // Focus textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const clearReplyTarget = () => setReplyingTo(null);

  const handleSubmit = async () => {
    if (!replyText.trim() || !user || isOverLimit) return;

    setIsSubmitting(true);
    touchSession();

    try {
      if (hiveUser?.username && source !== 'soft') {
        // Hive user broadcast
        // If replying to a Hive comment, use its author/permlink as parent
        // Otherwise (top-level or replying to soft comment), use sportsbite as parent
        const parentAuthor =
          replyingTo && replyingTo.source !== 'soft' ? replyingTo.author : author;
        const parentPermlink =
          replyingTo && replyingTo.source !== 'soft' ? replyingTo.permlink : permlink;

        const operation = createCommentOperation({
          author: hiveUser.username,
          body: replyText.trim(),
          parentAuthor,
          parentPermlink,
        });

        const result = await broadcast([['comment', operation]], 'posting');
        if (!result.success) {
          throw new Error(result.error || 'Failed to broadcast reply');
        }
      } else {
        // Soft user — post via API
        // parentCommentId is set only when replying to another soft comment
        const parentCommentId =
          replyingTo && replyingTo.source === 'soft' ? replyingTo.permlink : undefined;

        const response = await fetch('/api/soft/comments', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: `hive-${author}-${permlink}`,
            postPermlink: permlink,
            body: replyText.trim(),
            parentCommentId,
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to post reply');
        }
      }

      addToast(toast.success('Reply Posted', 'Your reply has been posted.'));
      setReplyText('');
      setReplyingTo(null);
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="border-t bg-muted/20 px-3 py-3 sm:px-4 sm:pl-[60px]">
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Failed to load replies.</p>
      ) : flatComments.length > 0 ? (
        <div className="space-y-3">
          {flatComments.map(({ node, depth, parentAuthor }) => (
            <div
              key={`${node.comment.author}-${node.comment.permlink}`}
              className={cn(
                'flex gap-2',
                depth === 1 && 'ml-6 border-l-2 border-muted-foreground/20 pl-3',
                depth >= 2 && 'ml-12 border-l-2 border-muted-foreground/10 pl-3'
              )}
            >
              <Avatar
                src={getHiveAvatarUrl(node.comment.author)}
                fallback={node.comment.author}
                alt={node.comment.author}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                {/* "Replying to" indicator for nested replies */}
                {depth > 0 && parentAuthor && (
                  <p className="mb-0.5 text-xs text-muted-foreground">
                    Replying to <span className="font-medium text-primary">@{parentAuthor}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">@{node.comment.author}</span>
                  <RoleBadge username={node.comment.author} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(new Date(node.comment.created))}
                  </span>
                </div>
                <CommentContent body={node.comment.body} className="mt-0.5 text-sm" />
                <div className="mt-1 flex items-center gap-2">
                  <CommentVoteButton
                    author={node.comment.author}
                    permlink={node.comment.permlink}
                    voteCount={node.comment.net_votes || 0}
                    onVoteSuccess={() => {
                      addToast(toast.success('Voted!', 'Your vote has been recorded.'));
                    }}
                    onVoteError={(err) => {
                      addToast(toast.error('Vote Failed', err));
                    }}
                  />
                  {user && (
                    <button
                      onClick={() => handleReplyTo(node.comment)}
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-2 text-center text-sm text-muted-foreground">
          No replies yet — be the first!
        </p>
      )}

      {/* Compose reply */}
      {user && (
        <div className="mt-3">
          {/* Reply target indicator */}
          {replyingTo && (
            <div className="mb-2 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-1.5 text-xs">
              <Reply className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">
                Replying to <span className="font-medium text-primary">@{replyingTo.author}</span>
              </span>
              <button
                onClick={clearReplyTarget}
                className="ml-auto rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

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
              placeholder={replyingTo ? `Reply to @${replyingTo.author}...` : 'Write a reply...'}
              className={cn(
                'flex-1 resize-none rounded-lg border bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary',
                isOverLimit && 'border-red-500 focus:ring-red-500'
              )}
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
              maxLength={MAX_REPLY_CHARS + 50} // Soft cap — let them type a bit over for editing
            />
            <Button
              size="sm"
              className="h-auto self-end px-3"
              onClick={handleSubmit}
              disabled={isSubmitting || !replyText.trim() || isOverLimit}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Character counter + toolbar row */}
          <div className="flex items-center justify-between sm:pl-10">
            <CommentToolbar
              textareaRef={textareaRef}
              text={replyText}
              setText={setReplyText}
              disabled={isSubmitting}
              username={user.username}
            />
            {charCount > 0 && (
              <span
                className={cn(
                  'text-xs tabular-nums',
                  remaining <= 0
                    ? 'font-medium text-red-500'
                    : remaining <= 20
                      ? 'text-yellow-500'
                      : 'text-muted-foreground'
                )}
              >
                {remaining}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
