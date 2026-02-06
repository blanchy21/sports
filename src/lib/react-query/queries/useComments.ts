import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { STALE_TIMES, getPostStaleTime } from '@/lib/constants/cache';

// Types for comments (imported from workerbee types)
interface HiveComment {
  author: string;
  permlink: string;
  body: string;
  created: string;
  parent_author?: string;
  parent_permlink?: string;
  net_votes?: number;
  [key: string]: unknown;
}

function isSoftPermlink(permlink: string): boolean {
  return permlink.startsWith('soft-');
}

/**
 * Fetch soft comments from Firebase and normalize to HiveComment shape.
 */
async function fetchSoftComments(author: string, permlink: string): Promise<HiveComment[]> {
  const postId = `hive-${author}-${permlink}`;
  const response = await fetch(`/api/soft/comments?postId=${encodeURIComponent(postId)}`);
  if (!response.ok) return [];
  const result = await response.json();
  if (!result.success || !Array.isArray(result.comments)) return [];

  return result.comments.map((c: Record<string, unknown>) => ({
    author: (c.authorUsername as string) || 'anonymous',
    permlink: c.id as string,
    body: c.body as string,
    created: c.createdAt as string,
    parent_author: author,
    parent_permlink: permlink,
    net_votes: 0,
    source: 'soft',
  }));
}

/**
 * Fetch comments for a post.
 * For soft posts: fetches from Firebase only.
 * For Hive posts: fetches from both Hive blockchain and Firebase, merged.
 */
export function useComments(
  author: string,
  permlink: string,
  options?: { postCreatedAt?: Date | string }
) {
  const staleTime = options?.postCreatedAt
    ? getPostStaleTime(options.postCreatedAt)
    : STALE_TIMES.REALTIME;

  return useQuery({
    queryKey: queryKeys.comments.list(`${author}/${permlink}`),
    queryFn: async () => {
      if (isSoftPermlink(permlink)) {
        // Soft posts: only fetch from Firebase
        return fetchSoftComments(author, permlink);
      }

      // Hive posts: fetch from both sources in parallel
      const [hiveResponse, softComments] = await Promise.all([
        fetch(
          `/api/hive/comments?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}`
        ),
        fetchSoftComments(author, permlink),
      ]);

      let hiveComments: HiveComment[] = [];
      if (hiveResponse.ok) {
        const result = await hiveResponse.json();
        hiveComments = result.success ? result.comments : [];
      }

      // Merge: Hive comments first, then soft comments
      return [...hiveComments, ...softComments];
    },
    enabled: !!author && !!permlink,
    staleTime,
  });
}

export function useUserComments(username: string, limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.comments.user(username),
    queryFn: async () => {
      const response = await fetch(
        `/api/hive/comments?username=${encodeURIComponent(username)}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch user comments: ${response.status}`);
      }
      const result = await response.json();
      return (result.success ? result.comments : []) as HiveComment[];
    },
    enabled: !!username,
    staleTime: STALE_TIMES.REALTIME,
  });
}

export function useInvalidateComments() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: queryKeys.comments.all }),
    invalidatePostComments: (author: string, permlink: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(`${author}/${permlink}`) }),
  };
}
