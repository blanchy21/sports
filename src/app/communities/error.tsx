'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function CommunitiesError({
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
      title="Communities Error"
      message="Failed to load communities. Please try again."
    />
  );
}
