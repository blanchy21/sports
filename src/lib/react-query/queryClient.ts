import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Optimized caching strategy
      staleTime: 2 * 60 * 1000, // 2 minutes - shorter for real-time data
      gcTime: 5 * 60 * 1000, // 5 minutes - reduced memory usage
      
      // Smart retry logic
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
          if (error.status >= 400 && error.status < 500) {
            return false;
          }
        }
        // Exponential backoff for network errors
        return failureCount < 2;
      },
      
      // Performance optimizations
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Prevent unnecessary refetches
      refetchOnReconnect: true,
      
      // Network optimizations
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
  },
  comments: {
    all: ['comments'] as const,
    lists: () => [...queryKeys.comments.all, 'list'] as const,
    list: (postId: string) => [...queryKeys.comments.lists(), postId] as const,
    user: (username: string) => [...queryKeys.comments.all, 'user', username] as const,
  },
  users: {
    all: ['users'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (username: string) => [...queryKeys.users.details(), username] as const,
    followers: (username: string) => [...queryKeys.users.detail(username), 'followers'] as const,
    following: (username: string) => [...queryKeys.users.detail(username), 'following'] as const,
  },
  communities: {
    all: ['communities'] as const,
    lists: () => [...queryKeys.communities.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.communities.lists(), filters] as const,
    details: () => [...queryKeys.communities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.communities.details(), id] as const,
    members: (id: string) => [...queryKeys.communities.detail(id), 'members'] as const,
  },
  votes: {
    all: ['votes'] as const,
    lists: () => [...queryKeys.votes.all, 'list'] as const,
    list: (postId: string) => [...queryKeys.votes.lists(), postId] as const,
  },
  medals: {
    all: ['medals'] as const,
    balance: (account: string) => [...queryKeys.medals.all, 'balance', account] as const,
    stake: (account: string) => [...queryKeys.medals.all, 'stake', account] as const,
    history: (account: string) => [...queryKeys.medals.all, 'history', account] as const,
    market: () => [...queryKeys.medals.all, 'market'] as const,
  },
} as const;
