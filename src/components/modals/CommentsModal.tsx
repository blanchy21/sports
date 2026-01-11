"use client";

import React, { useState } from "react";
import { useComments } from "@/lib/react-query/queries/useComments";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { MessageCircle, Send } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast, toast } from "@/components/ui/Toast";
import { publishComment } from "@/lib/hive-workerbee/posting";
import { useInvalidateComments } from "@/lib/react-query/queries/useComments";
import { useAioha } from "@/contexts/AiohaProvider";
import { CommentVoteButton } from "@/components/CommentVoteButton";
import { BaseModal } from "@/components/ui/BaseModal";

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
  const { aioha, isInitialized, error: aiohaError } = useAioha();
  
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: comments, isLoading, error } = useComments(author || '', permlink || '');

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      addToast({
        title: "Comment Required",
        description: "Please enter a comment",
        type: "error"
      });
      return;
    }

    if (!user) {
      addToast({
        title: "Authentication Required",
        description: "Please sign in to comment",
        type: "error"
      });
      return;
    }

    if (authType !== "hive" || !hiveUser?.username) {
      addToast({
        title: "Hive Authentication Required",
        description: "Hive authentication required for commenting",
        type: "error"
      });
      return;
    }

    if (!isInitialized || !aioha) {
      addToast({
        title: "Aioha Not Ready",
        description: "Aioha authentication is not ready. Please wait a moment and try again.",
        type: "error"
      });
      return;
    }

    if (aiohaError) {
      addToast({
        title: "Aioha Error",
        description: `Aioha authentication error: ${aiohaError}`,
        type: "error"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const commentData = {
        author: hiveUser.username,
        body: commentText.trim(),
        parentAuthor: author,
        parentPermlink: permlink,
        jsonMetadata: JSON.stringify({
          app: 'sportsblock/1.0.0',
          format: 'markdown'
        })
      };

      const result = await publishComment(commentData, aioha);

      if (result.success) {
        addToast({
          title: "Success",
          description: "Comment posted successfully!",
          type: "success"
        });
        setCommentText("");
        // Invalidate comments to refresh the list
        invalidatePostComments(author, permlink);
      } else {
        addToast({
          title: "Comment Failed",
          description: `Failed to post comment: ${result.error}`,
          type: "error"
        });
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      addToast({
        title: "Comment Failed",
        description: "Failed to post comment. Please try again.",
        type: "error"
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
          {comments && (
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
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex space-x-3 animate-pulse">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-full mb-1"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
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
                      fallback={comment.author}
                      alt={comment.author}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">@{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(new Date(comment.created))}
                        </span>
                        {isNestedReply && (
                          <span className="text-xs text-accent bg-accent/20 px-2 py-1 rounded">
                            Reply to @{comment.parent_author}
                          </span>
                        )}
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {comment.body}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          Reply
                        </Button>
                        <CommentVoteButton
                          author={comment.author}
                          permlink={comment.permlink}
                          voteCount={comment.net_votes || 0}
                          onVoteSuccess={() => {
                            addToast(toast.success("Comment Voted!", "Your vote has been recorded on the blockchain."));
                          }}
                          onVoteError={(error) => {
                            addToast(toast.error("Vote Failed", error));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Comments Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Be the first to comment on this post!
              </p>
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className="border-t p-6">
        <div className="flex space-x-3">
          <Avatar
            fallback={user?.username?.[0] || "U"}
            alt={user?.username || "You"}
            size="sm"
          />
          <div className="flex-1">
            <textarea
              placeholder="Write a comment... (Ctrl+Enter to submit)"
              className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
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
          </div>
          <Button 
            size="sm" 
            className="self-end"
            onClick={handleSubmitComment}
            disabled={isSubmitting || !commentText.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};
