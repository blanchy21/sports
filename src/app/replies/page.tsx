"use client";

import React from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/MainLayout";
import { MessageSquare, Reply, ThumbsUp, Loader2, Wifi, Zap } from "lucide-react";
import { useUserComments } from "@/lib/react-query/queries/useComments";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeReplies } from "@/hooks/useRealtimeReplies";
import { formatDistanceToNow } from "date-fns";
import { CommentVoteButton } from "@/components/CommentVoteButton";

export default function RepliesPage() {
  const { user, isClient } = useAuth();
  const { data: comments, isLoading, error } = useUserComments(user?.username || '', 20);
  const { replies: realtimeReplies, isConnected, error: realtimeError } = useRealtimeReplies();

  // Combine static comments with real-time replies
  const allReplies = React.useMemo(() => {
    if (!comments) return realtimeReplies;
    
    // Convert comments to the same format as realtime replies
    const staticReplies = comments.map(comment => ({
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

    // Merge and deduplicate
    const combined = [...realtimeReplies];
    staticReplies.forEach(staticReply => {
      if (!combined.some(r => r.permlink === staticReply.permlink)) {
        combined.push(staticReply);
      }
    });

    // Sort by creation date (newest first)
    return combined.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }, [comments, realtimeReplies]);

  // Show loading state during SSR
  if (!isClient) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show login prompt if user is not authenticated
  if (!user?.username) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-card border rounded-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-muted rounded-full">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Please log in</h2>
            <p className="text-muted-foreground">
              You need to be logged in to view your comments and replies
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Helper function to get avatar URL
  const getAvatarUrl = (username: string) => {
    return `https://images.hive.blog/u/${username}/avatar/small`;
  };

  // Helper function to format timestamp
  const formatTimestamp = (created: string) => {
    try {
      return formatDistanceToNow(new Date(created), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  // Helper function to get post title from parent permlink
  const getPostTitle = (parentAuthor: string, parentPermlink: string) => {
    return `@${parentAuthor}/${parentPermlink}`;
  };
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold flex items-center space-x-3">
                      <MessageSquare className="h-8 w-8 text-primary" />
                      <span>Replies</span>
                      {isConnected && (
                        <div className="flex items-center space-x-2 ml-4">
                          <div className="flex items-center space-x-1 text-accent">
                            <Wifi className="h-4 w-4" />
                            <span className="text-sm font-medium">Live</span>
                          </div>
                          <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Your conversations and interactions
                      {realtimeError && (
                        <span className="text-red-500 ml-2">• Real-time updates unavailable</span>
                      )}
                    </p>
                  </div>
                </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{allReplies.length}</div>
                <div className="text-sm text-muted-foreground">Total Comments</div>
                {realtimeReplies.length > 0 && (
                  <div className="text-xs text-accent flex items-center">
                    <Zap className="h-3 w-3 mr-1" />
                    {realtimeReplies.length} live
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Reply className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {new Set(allReplies.map(r => `${r.parentAuthor}/${r.parentPermlink}`)).size}
                </div>
                <div className="text-sm text-muted-foreground">Unique Posts</div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
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
          <h2 className="text-lg font-semibold">Recent Comments</h2>
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading comments...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive">Failed to load comments. Please try again.</p>
            </div>
          )}

                  {/* Comments List */}
                  {allReplies && allReplies.length > 0 && (
                    <div className="space-y-4">
                      {allReplies.map((reply) => (
                        <div 
                          key={`${reply.author}/${reply.permlink}`} 
                          className={`bg-card border rounded-lg p-5 hover:shadow-md transition-all duration-300 ${
                            reply.isNew 
                              ? 'border-accent/30 bg-accent/10 shadow-lg animate-pulse' 
                              : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start space-x-4">
                            <Image
                              src={getAvatarUrl(reply.author)}
                              alt={reply.author}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full"
                              onError={(e) => {
                                // Fallback to a default avatar if Hive image fails
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${reply.author}&background=random`;
                              }}
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-medium">@{reply.author}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">{formatTimestamp(reply.created)}</span>
                                {reply.isNew && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent/20 text-accent-foreground font-medium">
                                    <Zap className="h-3 w-3 mr-1" />
                                    New
                                  </span>
                                )}
                              </div>
                              
                              <div className="mb-2">
                                <span className="text-sm text-muted-foreground">Replied to: </span>
                                <span className="text-sm font-medium">{getPostTitle(reply.parentAuthor, reply.parentPermlink)}</span>
                              </div>
                              
                              <p className="text-foreground mb-3 whitespace-pre-wrap">{reply.body}</p>
                              
                              <div className="flex items-center space-x-4">
                                <CommentVoteButton
                                  author={reply.author}
                                  permlink={reply.permlink}
                                  voteCount={reply.netVotes || 0}
                                  onVoteSuccess={() => {
                                    // Vote recorded successfully
                                  }}
                                  onVoteError={() => {
                                    // Vote error handled by button component
                                  }}
                                />
                                
                                <button className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-primary transition-colors">
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

                {/* Empty State (when no replies) */}
                {!isLoading && !error && (!allReplies || allReplies.length === 0) && (
          <div className="bg-card border rounded-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-muted rounded-full">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">No comments yet</h2>
            <p className="text-muted-foreground">
              When you comment on posts, they&apos;ll appear here
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

