export interface Notification {
  id: string;
  type:
    | 'comment'
    | 'vote'
    | 'post'
    | 'mention'
    | 'short_reply'
    | 'like'
    | 'reply'
    | 'follow'
    | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  source?: 'hive' | 'soft';
  data?: {
    author?: string;
    permlink?: string;
    parentAuthor?: string;
    parentPermlink?: string;
    weight?: number;
    voter?: string;
    isShort?: boolean;
    postId?: string;
    postPermlink?: string;
    commentId?: string;
    parentCommentId?: string;
    targetType?: string;
    targetId?: string;
    sourceUserId?: string;
    sourceUsername?: string;
  };
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  isRealtimeActive: boolean;
  isSoftUser: boolean;
}
