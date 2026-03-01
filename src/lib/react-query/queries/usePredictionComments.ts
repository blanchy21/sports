import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PredictionComment {
  id: string;
  predictionId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  tipTotal?: number;
  tipCount?: number;
}

export function usePredictionComments(predictionId: string) {
  return useQuery({
    queryKey: ['prediction-comments', predictionId],
    queryFn: async () => {
      const res = await fetch(`/api/predictions/${predictionId}/comments`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to fetch comments');
      return data.comments as PredictionComment[];
    },
    enabled: !!predictionId,
    staleTime: 30_000,
  });
}

export function useCreatePredictionComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { predictionId: string; body: string; parentCommentId?: string }) => {
      const res = await fetch(`/api/predictions/${input.predictionId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: input.body, parentCommentId: input.parentCommentId }),
      });
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error?.message || data.error || 'Failed to post comment');
      return data.comment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prediction-comments', variables.predictionId] });
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}
