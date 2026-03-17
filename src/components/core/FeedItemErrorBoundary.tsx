'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/core/Button';

interface FeedItemErrorBoundaryProps {
  children: React.ReactNode;
}

interface FeedItemErrorBoundaryState {
  hasError: boolean;
}

/**
 * Generic error boundary for individual feed items (PostCard, SportsbiteCard, etc.).
 * Catches rendering errors in a single card without crashing the entire feed.
 */
export class FeedItemErrorBoundary extends React.Component<
  FeedItemErrorBoundaryProps,
  FeedItemErrorBoundaryState
> {
  constructor(props: FeedItemErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): FeedItemErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[FeedItemErrorBoundary] Card render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-between border-b border-sb-border px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span>Something went wrong rendering this item.</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => this.setState({ hasError: false })}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
