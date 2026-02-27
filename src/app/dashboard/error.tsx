'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function DashboardError({
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
      title="Dashboard Error"
      message="Failed to load the dashboard. Please try again."
    />
  );
}
