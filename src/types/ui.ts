/**
 * UI state and component type definitions
 */

import type { User } from './user';

export type AuthType = 'guest' | 'soft' | 'hive';

export interface AuthState {
  user: User | null;
  authType: AuthType;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ThemeState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export interface NotificationItem {
  id: string;
  type: 'upvote' | 'comment' | 'follow' | 'mention';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actor?: User;
  postId?: string;
  commentId?: string;
}

export interface ModalState {
  isOpen: boolean;
  type: 'comments' | 'upvoteList' | 'description' | 'userProfile' | null;
  data: Record<string, unknown> | null;
}
