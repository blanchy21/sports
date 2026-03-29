'use client';

import { useState, useCallback } from 'react';

export interface RealtimeReply {
  id: string;
  author: string;
  permlink: string;
  parentAuthor: string;
  parentPermlink: string;
  body: string;
  created: string;
  netVotes: number;
  isNew: boolean;
}

/**
 * Hook for real-time replies. WorkerBee is server-side only and cannot be
 * used in client components. This hook provides the interface so the replies
 * page can still render, but real-time streaming would require a proper SSE
 * or WebSocket endpoint to push data from the server.
 */
export const useRealtimeReplies = () => {
  const [replies] = useState<RealtimeReply[]>([]);
  const [isConnected] = useState(false);
  const [error] = useState<string | null>(null);

  const addReply = useCallback((reply: RealtimeReply) => {
    void reply;
  }, []);

  const updateReplyVotes = useCallback((permlink: string, netVotes: number) => {
    void permlink;
    void netVotes;
  }, []);

  return {
    replies,
    isConnected,
    error,
    addReply,
    updateReplyVotes,
  };
};
