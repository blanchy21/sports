"use client";

import React from "react";
import { useComments } from "@/lib/react-query/queries/useComments";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { X, MessageCircle, Send } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, data }) => {
  const author = data?.author as string;
  const permlink = data?.permlink as string;
  
  const { data: comments, isLoading, error } = useComments(author || '', permlink || '', 50);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Comments</h2>
            {comments && (
              <span className="text-sm text-muted-foreground">
                ({comments.length})
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
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
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        Vote ({comment.net_votes})
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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
        <div className="p-6 border-t">
          <div className="flex space-x-3">
            <Avatar
              fallback="U"
              alt="You"
              size="sm"
            />
            <div className="flex-1">
              <textarea
                placeholder="Write a comment..."
                className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
            </div>
            <Button size="sm" className="self-end">
              <Send className="h-4 w-4 mr-2" />
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
