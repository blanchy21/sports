'use client';

import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/core/Button';

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}

export function RouteError({
  error,
  reset,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
}: RouteErrorProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card p-6 shadow-lg">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>

        <p className="text-sm text-muted-foreground">{message}</p>

        {process.env.NODE_ENV === 'development' && (
          <details className="rounded-md bg-muted p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Error Details
            </summary>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
              {error.message}
            </p>
          </details>
        )}

        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <Button onClick={reset} variant="default" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => {
              window.location.href = '/';
            }}
            variant="outline"
            className="flex-1"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
