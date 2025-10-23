"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getWorkerBeeClient } from '@/lib/hive-workerbee/client';

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

interface Subscription {
  unsubscribe: () => void;
}

export const useRealtimeReplies = () => {
  const [replies, setReplies] = useState<RealtimeReply[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isClient } = useAuth();

  const addReply = useCallback((reply: RealtimeReply) => {
    setReplies(prev => {
      // Check if reply already exists
      const exists = prev.some(r => r.permlink === reply.permlink);
      if (exists) return prev;
      
      // Add new reply at the top
      return [reply, ...prev];
    });
  }, []);

  const updateReplyVotes = useCallback((permlink: string, netVotes: number) => {
    setReplies(prev => 
      prev.map(reply => 
        reply.permlink === permlink 
          ? { ...reply, netVotes }
          : reply
      )
    );
  }, []);

  useEffect(() => {
    if (!isClient || !user?.username) {
      setIsConnected(false);
      return;
    }

    let commentSubscription: Subscription | null = null;
    let voteSubscription: Subscription | null = null;

    const initializeRealtime = async () => {
      try {
        const workerBee = getWorkerBeeClient();
        setIsConnected(true);
        setError(null);

        // Monitor comments by the user
        commentSubscription = workerBee.observe.onComments(user.username).subscribe({
          next: (data) => {
            try {
              // Handle WorkerBee data structure
              if (data && data.comments) {
                const comments = Array.isArray(data.comments) ? data.comments : [];
                if (comments.length > 0) {
                  comments.forEach((comment: { operation: { author: string; permlink: string; body: string; created: string; net_votes: number; parent_author: string; parent_permlink: string }; timestamp: string }) => {
                    const operation = comment.operation;
                    if (operation) {
                      addReply({
                        id: `${operation.author}-${operation.permlink}`,
                        author: operation.author,
                        permlink: operation.permlink,
                        parentAuthor: operation.parent_author,
                        parentPermlink: operation.parent_permlink,
                        body: operation.body,
                        created: comment.timestamp || new Date().toISOString(),
                        netVotes: 0,
                        isNew: true,
                      });
                    }
                  });
                }
              }
            } catch (error) {
              console.error('Error processing comments data:', error);
            }
          },
          error: (error) => {
            console.error('Error monitoring user comments:', error);
            setError('Failed to monitor comments');
            setIsConnected(false);
          }
        });

        // Monitor votes on user's comments
        voteSubscription = workerBee.observe.onVotes().subscribe({
          next: (data) => {
            try {
              // Handle WorkerBee data structure
              if (data && data.votes) {
                const votes = Array.isArray(data.votes) ? data.votes : [];
                if (votes.length > 0) {
                  votes.forEach((vote: { operation: { author: string; permlink: string; weight: number } }) => {
                    const operation = vote.operation;
                    if (operation && operation.author === user.username) {
                      updateReplyVotes(operation.permlink, operation.weight || 0);
                    }
                  });
                }
              }
            } catch (error) {
              console.error('Error processing votes data:', error);
            }
          },
          error: (error) => {
            console.error('Error monitoring votes:', error);
            setError('Failed to monitor votes');
            setIsConnected(false);
          }
        });

      } catch (error) {
        console.error('Error initializing real-time replies:', error);
        setError('Failed to initialize real-time monitoring');
        setIsConnected(false);
      }
    };

    initializeRealtime();

    return () => {
      commentSubscription?.unsubscribe();
      voteSubscription?.unsubscribe();
    };
  }, [isClient, user?.username, addReply, updateReplyVotes]);

  // Mark replies as not new after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setReplies(prev => 
        prev.map(reply => ({ ...reply, isNew: false }))
      );
    }, 5000); // Mark as not new after 5 seconds

    return () => clearTimeout(timer);
  }, [replies]);

  return {
    replies,
    isConnected,
    error,
    addReply,
    updateReplyVotes,
  };
};
