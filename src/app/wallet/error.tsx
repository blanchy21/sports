'use client';

import { RouteError } from '@/components/feedback/RouteError';

export default function WalletError({
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
      title="Wallet Error"
      message="Failed to load wallet data. Please try again."
    />
  );
}
