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
