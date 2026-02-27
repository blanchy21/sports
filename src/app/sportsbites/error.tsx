'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function SportsBitesError({
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
      title="SportsBites Error"
      message="Failed to load SportsBites. Please try again."
    />
  );
}
