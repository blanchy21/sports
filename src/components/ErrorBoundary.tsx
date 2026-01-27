'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { reportErrorBoundary } from '@/lib/utils/error-reporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report error to error reporting service
    reportErrorBoundary(error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error boundary when resetKeys change
    if (this.state.hasError) {
      if (this.props.resetKeys && prevProps.resetKeys) {
        const hasResetKeyChanged = this.props.resetKeys.some(
          (key, index) => key !== prevProps.resetKeys?.[index]
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      } else if (this.props.resetOnPropsChange) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Don&apos;t worry, your data is safe.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 rounded-md bg-muted p-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-destructive">Error:</p>
                      <p className="break-all font-mono text-xs text-muted-foreground">
                        {this.state.error.toString()}
                      </p>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <p className="text-xs font-semibold text-destructive">Stack Trace:</p>
                        <pre className="max-h-40 overflow-auto font-mono text-xs text-muted-foreground">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              <Button onClick={this.resetErrorBoundary} variant="default" className="flex-1">
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

    return this.props.children;
  }
}

/**
 * Hook-based Error Boundary wrapper for functional components
 * Note: React doesn't support hooks for error boundaries yet,
 * so this is a wrapper around the class component
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Compact error fallback for inline components (modals, cards, etc.)
 */
export function CompactErrorFallback({
  message = 'Failed to load',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 p-4">
      <AlertCircle className="mb-2 h-6 w-6 text-destructive" />
      <p className="mb-2 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * API Error Fallback - for when API calls fail
 * Shows a user-friendly message with retry option
 */
export function ApiErrorFallback({
  error,
  onRetry,
  title = 'Failed to load data',
  compact = false,
}: {
  error?: Error | string | null;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
}): React.ReactElement {
  const errorMessage = error instanceof Error ? error.message : error;
  const isNetworkError =
    errorMessage?.toLowerCase().includes('network') ||
    errorMessage?.toLowerCase().includes('fetch');
  const isServerError =
    errorMessage?.includes('500') ||
    errorMessage?.includes('502') ||
    errorMessage?.includes('503') ||
    errorMessage?.includes('504');

  const getUserFriendlyMessage = () => {
    if (isNetworkError) {
      return 'Please check your internet connection and try again.';
    }
    if (isServerError) {
      return 'Our servers are temporarily unavailable. Please try again in a moment.';
    }
    return 'Something went wrong while loading this content.';
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="ml-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/50 p-6">
      <div className="mb-4 rounded-full bg-destructive/10 p-3">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
        {getUserFriendlyMessage()}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Empty State Fallback - for when data is empty (not an error)
 */
export function EmptyStateFallback({
  title = 'No data found',
  description,
  icon: Icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
  };
}): React.ReactElement {
  const IconComponent = Icon || AlertCircle;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-muted/30 p-8">
      <div className="mb-4 rounded-full bg-muted p-3">
        <IconComponent className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Loading Fallback - skeleton placeholder during loading
 */
export function LoadingFallback({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-muted"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Data Fetching Wrapper - handles loading, error, and empty states
 * Use this to wrap components that fetch data
 */
export function DataFetchWrapper<T>({
  isLoading,
  error,
  data,
  onRetry,
  loadingFallback,
  errorFallback,
  emptyFallback,
  children,
}: {
  isLoading: boolean;
  error?: Error | string | null;
  data?: T | null;
  onRetry?: () => void;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}): React.ReactElement {
  if (isLoading) {
    return <>{loadingFallback || <LoadingFallback />}</>;
  }

  if (error) {
    return <>{errorFallback || <ApiErrorFallback error={error} onRetry={onRetry} />}</>;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <>{emptyFallback || <EmptyStateFallback />}</>;
  }

  return <>{children(data)}</>;
}
