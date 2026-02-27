'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function DiscoverError({
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
      title="Discover Error"
      message="Failed to load the discover page. Please try again."
    />
  );
}
