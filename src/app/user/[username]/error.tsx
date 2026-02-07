'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function UserError({
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
      title="Profile Error"
      message="Failed to load this profile. Please try again."
    />
  );
}
