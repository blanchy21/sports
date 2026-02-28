'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function PredictionsError({
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
      title="Predictions Error"
      message="Failed to load predictions. Please try again."
    />
  );
}
