'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Post Error"
      message="Failed to load this post. Please try again."
    />
  );
}
