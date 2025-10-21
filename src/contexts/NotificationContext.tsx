"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getWorkerBeeClient } from "@/lib/hive-workerbee/client";

export interface Notification {
  id: string;
  type: 'comment' | 'vote' | 'post' | 'mention';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: {
    author?: string;
    permlink?: string;
    parentAuthor?: string;
    parentPermlink?: string;
    weight?: number;
    voter?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  isRealtimeActive: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const { user, isClient } = useAuth();

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (!isClient) return;
    
    const savedNotifications = localStorage.getItem('sportsblock-notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        const notificationsWithDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notificationsWithDates);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  }, [isClient]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem('sportsblock-notifications', JSON.stringify(notifications));
  }, [notifications, isClient]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 100)); // Keep last 100 notifications
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Initialize real-time monitoring when user is logged in
  useEffect(() => {
    if (!isClient || !user?.username) {
      setIsRealtimeActive(false);
      return;
    }

    let commentSubscription: any;
    let voteSubscription: any;

    const initializeRealtime = async () => {
      try {
        const workerBee = getWorkerBeeClient();
        
        // Start the WorkerBee client if not already running
        if (!workerBee.running) {
          await workerBee.start();
          console.log('[NotificationContext] WorkerBee client started');
        }
        
        setIsRealtimeActive(true);

        // Monitor comments on user's posts
        console.log('[NotificationContext] Setting up comment monitoring for user:', user.username);
        commentSubscription = workerBee.observe.onComments().subscribe({
          next: (data) => {
            try {
              console.log('[NotificationContext] Comment data received:', data);
              // Handle WorkerBee data structure
              if (data && data.comments) {
                const comments = Array.isArray(data.comments) ? data.comments : [];
                comments.forEach((comment: any) => {
                  const operation = comment.operation;
                  
                  // Only notify if it's a comment on the user's posts
                  if (operation && operation.parent_author === user.username) {
                    console.log('[NotificationContext] Adding comment notification for:', operation.author);
                    addNotification({
                      type: 'comment',
                      title: 'New Comment',
                      message: `@${operation.author} commented on your post`,
                      data: {
                        author: operation.author,
                        permlink: operation.permlink,
                        parentAuthor: operation.parent_author,
                        parentPermlink: operation.parent_permlink,
                      }
                    });
                  }
                });
              }
            } catch (error) {
              console.error('Error processing comments data:', error);
            }
          },
          error: (error) => {
            console.error('Error monitoring comments:', error);
            setIsRealtimeActive(false);
          }
        });

        // Monitor votes on user's posts
        console.log('[NotificationContext] Setting up vote monitoring for user:', user.username);
        voteSubscription = workerBee.observe.onVotes().subscribe({
          next: (data) => {
            try {
              console.log('[NotificationContext] Vote data received:', data);
              // Handle WorkerBee data structure
              if (data && data.votes) {
                const votes = Array.isArray(data.votes) ? data.votes : [];
                votes.forEach((vote: any) => {
                  const operation = vote.operation;
                  
                  // Only notify if it's a vote on the user's posts
                  if (operation && operation.author === user.username) {
                    console.log('[NotificationContext] Adding vote notification for:', operation.voter);
                    addNotification({
                      type: 'vote',
                      title: 'New Vote',
                      message: `@${operation.voter} voted on your post`,
                      data: {
                        voter: operation.voter,
                        author: operation.author,
                        permlink: operation.permlink,
                        weight: operation.weight,
                      }
                    });
                  }
                });
              }
            } catch (error) {
              console.error('Error processing votes data:', error);
            }
          },
          error: (error) => {
            console.error('Error monitoring votes:', error);
            setIsRealtimeActive(false);
          }
        });

        // Monitor new posts in sportsblock community
        // Note: onPostsWithTags might not be available, so we'll skip this for now
        // and focus on comments and votes which are more reliable

      } catch (error) {
        console.error('Error initializing real-time monitoring:', error);
        setIsRealtimeActive(false);
      }
    };

    initializeRealtime();

    return () => {
      commentSubscription?.unsubscribe();
      voteSubscription?.unsubscribe();
      // postSubscription?.unsubscribe(); // Not needed since we removed it
    };
  }, [isClient, user?.username, addNotification]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isRealtimeActive,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
