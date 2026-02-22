'use client';

import React from 'react';
import Image from 'next/image';
import { MessageSquare, Reply, ThumbsUp, Loader2, Wifi, Zap } from 'lucide-react';
import { useUserComments } from '@/lib/react-query/queries/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeReplies } from '@/features/hive/hooks/useRealtimeReplies';
import { formatDistanceToNow } from 'date-fns';
import { CommentVoteButton } from '@/components/posts/CommentVoteButton';
import { sanitizePostContent } from '@/lib/utils/sanitize';
import { getHiveAvatarUrl } from '@/contexts/auth/useAuthProfile';

export function RepliesContent() {
  const { user, isClient } = useAuth();
  const { data: comments, isLoading, error } = useUserComments(user?.username || '', 20);
  const { replies: realtimeReplies, isConnected, error: realtimeError } = useRealtimeReplies();

  const allReplies = React.useMemo(() => {
    if (!comments) return realtimeReplies;

    const staticReplies = comments.map((comment) => ({
      id: `${comment.author}-${comment.permlink}`,
      author: comment.author,
      permlink: comment.permlink,
      parentAuthor: comment.parent_author || '',
      parentPermlink: comment.parent_permlink || '',
      body: comment.body,
      created: comment.created,
      netVotes: comment.net_votes || 0,
      isNew: false,
    }));

    const combined = [...realtimeReplies];
    staticReplies.forEach((staticReply) => {
      if (!combined.some((r) => r.permlink === staticReply.permlink)) {
        combined.push(staticReply);
      }
    });

    return combined.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }, [comments, realtimeReplies]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!user?.username) {
    return null;
  }

  const getAvatarUrl = (username: string) => {
    return getHiveAvatarUrl(username, 'small');
  };

  const formatTimestamp = (created: string) => {
    try {
      return formatDistanceToNow(new Date(created), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const getPostTitle = (parentAuthor: string, parentPermlink: string) => {
    return `@${parentAuthor}/${parentPermlink}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center space-x-3 text-2xl font-bold">
            <MessageSquare className="h-7 w-7 text-primary" />
            <span>Replies</span>
            {isConnected && (
              <div className="ml-4 flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-accent">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm font-medium">Live</span>
                </div>
                <div className="h-2 w-2 animate-pulse rounded-full bg-accent"></div>
              </div>
            )}
          </h2>
          <p className="mt-2 text-muted-foreground">
            Your conversations and interactions
            {realtimeError && (
              <span className="ml-2 text-red-500">&bull; Real-time updates unavailable</span>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{allReplies.length}</div>
              <div className="text-sm text-muted-foreground">Total Comments</div>
              {realtimeReplies.length > 0 && (
                <div className="flex items-center text-xs text-accent">
                  <Zap className="mr-1 h-3 w-3" />
                  {realtimeReplies.length} live
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Reply className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {new Set(allReplies.map((r) => `${r.parentAuthor}/${r.parentPermlink}`)).size}
              </div>
              <div className="text-sm text-muted-foreground">Unique Posts</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <ThumbsUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {allReplies.reduce((sum, r) => sum + (r.netVotes || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Votes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Replies List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Comments</h3>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading comments...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <p className="text-destructive">Failed to load comments. Please try again.</p>
          </div>
        )}

        {allReplies && allReplies.length > 0 && (
          <div className="space-y-4">
            {allReplies.map((reply) => (
              <div
                key={`${reply.author}/${reply.permlink}`}
                className={`rounded-lg border bg-card p-5 transition-all duration-300 hover:shadow-md ${
                  reply.isNew
                    ? 'animate-pulse border-accent/30 bg-accent/10 shadow-lg'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <Image
                    src={getAvatarUrl(reply.author)}
                    alt={reply.author}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://ui-avatars.com/api/?name=${reply.author}&background=random`;
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <span className="font-medium">@{reply.author}</span>
                      <span className="text-muted-foreground">&bull;</span>
                      <span className="text-sm text-muted-foreground">
                        {formatTimestamp(reply.created)}
                      </span>
                      {reply.isNew && (
                        <span className="inline-flex items-center rounded-full bg-accent/20 px-2 py-1 text-xs font-medium text-accent-foreground">
                          <Zap className="mr-1 h-3 w-3" />
                          New
                        </span>
                      )}
                    </div>

                    <div className="mb-2 overflow-hidden">
                      <span className="text-sm text-muted-foreground">Replied to: </span>
                      <span className="break-all text-sm font-medium">
                        {getPostTitle(reply.parentAuthor, reply.parentPermlink)}
                      </span>
                    </div>

                    <div
                      className="prose prose-sm mb-3 max-w-none overflow-hidden whitespace-pre-wrap break-words text-foreground"
                      dangerouslySetInnerHTML={{ __html: sanitizePostContent(reply.body) }}
                    />

                    <div className="flex items-center space-x-4">
                      <CommentVoteButton
                        author={reply.author}
                        permlink={reply.permlink}
                        voteCount={reply.netVotes || 0}
                        onVoteSuccess={() => {}}
                        onVoteError={() => {}}
                      />

                      <button className="flex items-center space-x-1 text-sm text-muted-foreground transition-colors hover:text-primary">
                        <Reply className="h-4 w-4" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && !error && (!allReplies || allReplies.length === 0) && (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold">No comments yet</h2>
          <p className="text-muted-foreground">
            When you comment on posts, they&apos;ll appear here
          </p>
        </div>
      )}
    </div>
  );
}
