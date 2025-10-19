import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthType } from '@/types';
import { HiveAuthUser } from '@/lib/shared/types';

interface AuthState {
  user: User | null;
  authType: AuthType;
  isAuthenticated: boolean;
  isLoading: boolean;
  hiveUser: HiveAuthUser | null;
}

interface AuthActions {
  login: (user: User, authType: AuthType) => void;
  loginWithHiveUser: (hiveUsername: string) => Promise<void>;
  loginWithAioha: (loginResult?: any) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setHiveUser: (hiveUser: HiveAuthUser | null) => void;
  refreshHiveAccount: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      authType: 'guest',
      isAuthenticated: false,
      isLoading: true,
      hiveUser: null,

      // Actions
      login: (user: User, authType: AuthType) => {
        set({
          user,
          authType,
          isAuthenticated: true,
        });
      },

      loginWithHiveUser: async (hiveUsername: string) => {
        // This will be implemented to work alongside the existing AuthContext
        // For now, we'll just set the basic state
        const basicUser: User = {
          id: hiveUsername,
          username: hiveUsername,
          displayName: hiveUsername,
          isHiveAuth: true,
          hiveUsername: hiveUsername,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const newHiveUser: HiveAuthUser = {
          username: hiveUsername,
          isAuthenticated: true,
        };

        set({
          user: basicUser,
          authType: 'hive',
          isAuthenticated: true,
          hiveUser: newHiveUser,
        });
      },

      loginWithAioha: async (loginResult?: any) => {
        // This will be implemented to work alongside the existing AuthContext
        // For now, we'll just set the basic state
        const userData = loginResult || { username: 'hiveuser' };
        
        const basicUser: User = {
          id: userData.username,
          username: userData.username,
          displayName: userData.username,
          isHiveAuth: true,
          hiveUsername: userData.username,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const newHiveUser: HiveAuthUser = {
          username: userData.username,
          isAuthenticated: true,
          provider: 'aioha',
        };

        set({
          user: basicUser,
          authType: 'hive',
          isAuthenticated: true,
          hiveUser: newHiveUser,
        });
      },

      logout: () => {
        set({
          user: null,
          authType: 'guest',
          isAuthenticated: false,
          hiveUser: null,
        });
      },

      updateUser: (userUpdate: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userUpdate },
          });
        }
      },

      setHiveUser: (hiveUser: HiveAuthUser | null) => {
        set({ hiveUser });
      },

      refreshHiveAccount: async () => {
        // This will be implemented to work alongside the existing AuthContext
        // For now, it's a placeholder
        console.log('refreshHiveAccount called - to be implemented');
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        authType: state.authType,
        isAuthenticated: state.isAuthenticated,
        hiveUser: state.hiveUser,
      }),
    }
  )
);
