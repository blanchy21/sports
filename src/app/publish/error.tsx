'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function PublishError({
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
      title="Publish Error"
      message="Something went wrong with the editor. Please try again."
    />
  );
}
