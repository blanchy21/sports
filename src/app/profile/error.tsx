'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function ProfileError({
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
      message="Failed to load your profile. Please try again."
    />
  );
}
