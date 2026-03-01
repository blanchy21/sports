'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Send, Loader2, Reply, X, MessageCircle, Coins } from 'lucide-react';
import { Avatar } from '@/components/core/Avatar';
import { Button } from '@/components/core/Button';
import { TipButton } from '@/components/sportsbites/TipButton';
import {
  usePredictionComments,
  useCreatePredictionComment,
} from '@/lib/react-query/queries/usePredictionComments';
import { useAuth } from '@/contexts/AuthContext';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';
import { cn, formatDate } from '@/lib/utils/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PredictionCommentsProps {
  predictionId: string;
}

interface CommentData {
  id: string;
  predictionId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  tipTotal?: number;
  tipCount?: number;
}

interface CommentNode {
  comment: CommentData;
  children: CommentNode[];
}

// ---------------------------------------------------------------------------
// Tree builder
// ---------------------------------------------------------------------------

function buildCommentTree(comments: CommentData[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    byId.set(comment.id, { comment, children: [] });
  }

  for (const comment of comments) {
    const node = byId.get(comment.id)!;
    const parentNode = comment.parentCommentId ? byId.get(comment.parentCommentId) : undefined;
    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Flatten tree with depth capped at 2. */
function flattenTree(
  tree: CommentNode[]
): { node: CommentNode; depth: number; parentUsername?: string }[] {
  const result: { node: CommentNode; depth: number; parentUsername?: string }[] = [];

  function walk(nodes: CommentNode[], depth: number, parentUser?: string) {
    for (const n of nodes) {
      result.push({ node: n, depth, parentUsername: parentUser });
      walk(n.children, Math.min(depth + 1, 2), n.comment.username);
    }
  }

  walk(tree, 0);
  return result;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CHARS = 280;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PredictionComments({ predictionId }: PredictionCommentsProps) {
  const { data: comments, isLoading, error } = usePredictionComments(predictionId);
  const { mutate: createComment, isPending: isSubmitting } = useCreatePredictionComment();
  const { user } = useAuth();

  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = replyText.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = remaining < 0;

  const flatComments = useMemo(() => {
    if (!comments || comments.length === 0) return [];
    const tree = buildCommentTree(comments);
    return flattenTree(tree);
  }, [comments]);

  const handleReplyTo = (comment: CommentData) => {
    setReplyingTo({ id: comment.id, username: comment.username });
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const clearReplyTarget = () => setReplyingTo(null);

  const handleSubmit = () => {
    if (!replyText.trim() || !user || isOverLimit || isSubmitting) return;

    createComment(
      {
        predictionId,
        body: replyText.trim(),
        parentCommentId: replyingTo?.id,
      },
      {
        onSuccess: () => {
          setReplyText('');
          setReplyingTo(null);
        },
      }
    );
  };

  return (
    <div className="border-t bg-muted/20 px-4 py-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Failed to load comments.</p>
      ) : flatComments.length > 0 ? (
        <div className="space-y-3">
          {flatComments.map(({ node, depth, parentUsername }) => (
            <div
              key={node.comment.id}
              className={cn(
                'flex gap-2',
                depth === 1 && 'ml-6 border-l-2 border-muted-foreground/20 pl-3',
                depth >= 2 && 'ml-12 border-l-2 border-muted-foreground/10 pl-3'
              )}
            >
              <Avatar
                src={node.comment.avatar || getHiveAvatarUrl(node.comment.username)}
                fallback={node.comment.username}
                alt={node.comment.username}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                {depth > 0 && parentUsername && (
                  <p className="mb-0.5 text-xs text-muted-foreground">
                    Replying to <span className="font-medium text-primary">@{parentUsername}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">@{node.comment.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(new Date(node.comment.createdAt))}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{node.comment.body}</p>
                <div className="mt-1 flex items-center gap-1">
                  {user && (
                    <button
                      onClick={() => handleReplyTo(node.comment)}
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </button>
                  )}
                  {user && user.username !== node.comment.username && (
                    <TipButton
                      author={node.comment.username}
                      permlink={`pred-comment-${node.comment.id}`}
                      className="h-6 px-1.5"
                    />
                  )}
                  {(node.comment.tipTotal ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                      <Coins className="h-3 w-3" />
                      {node.comment.tipTotal} MEDALS
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          No comments yet — be the first!
        </div>
      )}

      {/* Compose comment */}
      {user && (
        <div className="mt-3">
          {replyingTo && (
            <div className="mb-2 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-1.5 text-xs">
              <Reply className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">
                Replying to <span className="font-medium text-primary">@{replyingTo.username}</span>
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
              placeholder={
                replyingTo ? `Reply to @${replyingTo.username}...` : 'Write a comment...'
              }
              className={cn(
                'flex-1 resize-none rounded-lg border bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary',
                isOverLimit && 'border-destructive focus:ring-destructive'
              )}
              rows={2}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isSubmitting}
              maxLength={MAX_CHARS + 50}
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

          {charCount > 0 && (
            <div className="mt-1 text-right">
              <span
                className={cn(
                  'text-xs tabular-nums',
                  remaining <= 0
                    ? 'font-medium text-destructive'
                    : remaining <= 20
                      ? 'text-warning'
                      : 'text-muted-foreground'
                )}
              >
                {remaining}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
