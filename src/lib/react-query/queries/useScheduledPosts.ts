'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/queryClient';

export interface ScheduledPostItem {
  id: string;
  postData: {
    title: string;
    sportCategory?: string;
    communityName?: string;
    authorUsername: string;
  };
  scheduledAt: string;
  status: string;
  error?: string | null;
  publishedAt?: string | null;
  publishedPostId?: string | null;
  createdAt: string;
}

async function fetchScheduledPosts(): Promise<ScheduledPostItem[]> {
  const res = await fetch('/api/soft/scheduled-posts', { credentials: 'include' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch scheduled posts');
  return data.scheduledPosts;
}

async function cancelScheduledPost(id: string): Promise<void> {
  const res = await fetch(`/api/soft/scheduled-posts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to cancel scheduled post');
}

export function useScheduledPosts() {
  return useQuery({
    queryKey: queryKeys.scheduledPosts.all,
    queryFn: fetchScheduledPosts,
  });
}

export function useCancelScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelScheduledPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledPosts.all });
    },
  });
}
