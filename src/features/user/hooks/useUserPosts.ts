import { useState, useEffect, useCallback } from 'react';
import { SportsblockPost } from '@/lib/shared/types';

interface UseUserPostsResult {
  posts: SportsblockPost[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseUserPostsOptions {
  isHiveUser?: boolean;
  userId?: string; // For soft users, use their Firebase user ID
}

export function useUserPosts(
  username: string,
  limit: number = 5,
  options: UseUserPostsOptions = {}
): UseUserPostsResult {
  const { isHiveUser = true, userId } = options;
  const [posts, setPosts] = useState<SportsblockPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!username && !userId) {
      setPosts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response: Response;

      if (isHiveUser) {
        // Fetch from Hive API for Hive users
        response = await fetch(
          `/api/hive/posts?username=${encodeURIComponent(username)}&limit=${limit}`
        );
      } else {
        // Fetch from Firebase API for soft users
        const identifier = userId || username;
        response = await fetch(
          `/api/posts?authorId=${encodeURIComponent(identifier)}&limit=${limit}`
        );
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }
      const result = await response.json();
      setPosts(result.success ? result.posts : []);
    } catch (err) {
      console.error('Error fetching user posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setIsLoading(false);
    }
  }, [username, userId, limit, isHiveUser]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    isLoading,
    error,
    refetch: fetchPosts,
  };
}
