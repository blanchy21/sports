'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function MatchThreadsError({
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
      title="Match Threads Error"
      message="Failed to load match threads. Please try again."
    />
  );
}
