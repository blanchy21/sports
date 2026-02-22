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
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <span className="text-muted-foreground ml-2">Loading...</span>
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
            <MessageSquare className="text-primary h-7 w-7" />
            <span>Replies</span>
            {isConnected && (
              <div className="ml-4 flex items-center space-x-2">
                <div className="text-accent flex items-center space-x-1">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm font-medium">Live</span>
                </div>
                <div className="bg-accent h-2 w-2 animate-pulse rounded-full"></div>
              </div>
            )}
          </h2>
          <p className="text-muted-foreground mt-2">
            Your conversations and interactions
            {realtimeError && (
              <span className="ml-2 text-red-500">&bull; Real-time updates unavailable</span>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <MessageSquare className="text-primary h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{allReplies.length}</div>
              <div className="text-muted-foreground text-sm">Total Comments</div>
              {realtimeReplies.length > 0 && (
                <div className="text-accent flex items-center text-xs">
                  <Zap className="mr-1 h-3 w-3" />
                  {realtimeReplies.length} live
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <Reply className="text-primary h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {new Set(allReplies.map((r) => `${r.parentAuthor}/${r.parentPermlink}`)).size}
              </div>
              <div className="text-muted-foreground text-sm">Unique Posts</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <ThumbsUp className="text-primary h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {allReplies.reduce((sum, r) => sum + (r.netVotes || 0), 0)}
              </div>
              <div className="text-muted-foreground text-sm">Total Votes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Replies List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Comments</h3>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <span className="text-muted-foreground ml-2">Loading comments...</span>
          </div>
        )}

        {error && (
          <div className="border-destructive/20 bg-destructive/10 rounded-lg border p-4">
            <p className="text-destructive">Failed to load comments. Please try again.</p>
          </div>
        )}

        {allReplies && allReplies.length > 0 && (
          <div className="space-y-4">
            {allReplies.map((reply) => (
              <div
                key={`${reply.author}/${reply.permlink}`}
                className={`bg-card rounded-lg border p-5 transition-all duration-300 hover:shadow-md ${
                  reply.isNew
                    ? 'border-accent/30 bg-accent/10 animate-pulse shadow-lg'
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
                      <span className="text-muted-foreground text-sm">
                        {formatTimestamp(reply.created)}
                      </span>
                      {reply.isNew && (
                        <span className="bg-accent/20 text-accent-foreground inline-flex items-center rounded-full px-2 py-1 text-xs font-medium">
                          <Zap className="mr-1 h-3 w-3" />
                          New
                        </span>
                      )}
                    </div>

                    <div className="mb-2 overflow-hidden">
                      <span className="text-muted-foreground text-sm">Replied to: </span>
                      <span className="text-sm font-medium break-all">
                        {getPostTitle(reply.parentAuthor, reply.parentPermlink)}
                      </span>
                    </div>

                    <div
                      className="prose prose-sm text-foreground mb-3 max-w-none overflow-hidden wrap-break-word whitespace-pre-wrap"
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

                      <button className="text-muted-foreground hover:text-primary flex items-center space-x-1 text-sm transition-colors">
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
        <div className="bg-card rounded-lg border p-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-muted rounded-full p-4">
              <MessageSquare className="text-muted-foreground h-12 w-12" />
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
