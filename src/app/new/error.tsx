'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function NewError({
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
      title="Page Error"
      message="Failed to load the page. Please try again."
    />
  );
}
