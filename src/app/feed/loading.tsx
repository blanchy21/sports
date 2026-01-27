import { PostLoadingSkeleton } from '@/components/core/Loading';

/**
 * Feed Page Loading State
 *
 * Shows skeleton UI while the feed page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />

      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Write Post Section Skeleton */}
          <div className="animate-pulse rounded-lg border bg-card p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="h-10 flex-1 rounded-lg bg-muted" />
              <div className="h-10 w-20 rounded-lg bg-muted" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-lg bg-muted p-2" />
                  <div className="flex-1">
                    <div className="mb-1 h-8 w-16 rounded bg-muted" />
                    <div className="h-4 w-20 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-7 w-36 animate-pulse rounded bg-muted" />
            <div className="h-9 w-20 animate-pulse rounded bg-muted" />
          </div>

          {/* Posts Skeleton */}
          <PostLoadingSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}
