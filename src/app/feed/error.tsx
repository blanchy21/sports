'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function FeedError({
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
      title="Feed Error"
      message="Failed to load the feed. Please try again."
    />
  );
}
