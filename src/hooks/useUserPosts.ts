import { useState, useEffect, useCallback } from 'react';
import { getUserPosts, SportsblockPost } from '@/lib/hive-workerbee/content';

interface UseUserPostsResult {
  posts: SportsblockPost[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserPosts(username: string, limit: number = 5): UseUserPostsResult {
  const [posts, setPosts] = useState<SportsblockPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!username) {
      setPosts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userPosts = await getUserPosts(username, limit);
      setPosts(userPosts);
    } catch (err) {
      console.error('Error fetching user posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setIsLoading(false);
    }
  }, [username, limit]);

  useEffect(() => {
    fetchPosts();
  }, [username, limit, fetchPosts]);

  return {
    posts,
    isLoading,
    error,
    refetch: fetchPosts,
  };
}
