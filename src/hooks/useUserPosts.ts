import { useState, useEffect, useCallback } from 'react';

// Types (matching SportsblockPost from workerbee)
interface SportsblockPost {
  author: string;
  permlink: string;
  title: string;
  body: string;
  created: string;
  net_votes?: number;
  children?: number;
  pending_payout_value?: string;
  [key: string]: unknown;
}

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
      const response = await fetch(`/api/hive/posts?username=${encodeURIComponent(username)}&limit=${limit}`);
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
