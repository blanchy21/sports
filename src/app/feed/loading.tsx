import { PostLoadingSkeleton } from '@/components/core/Loading';

/**
 * Feed Page Loading State
 *
 * Shows skeleton UI while the feed page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function FeedLoading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Placeholder */}
      <div className="from-primary/10 to-accent/10 h-24 bg-linear-to-r" />

      <div className="lg:pl-80 xl:pr-112">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Write Post Section Skeleton */}
          <div className="bg-card animate-pulse rounded-lg border p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-muted h-10 w-10 rounded-full" />
              <div className="bg-muted h-10 flex-1 rounded-lg" />
              <div className="bg-muted h-10 w-20 rounded-lg" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card animate-pulse rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-muted h-9 w-9 rounded-lg p-2" />
                  <div className="flex-1">
                    <div className="bg-muted mb-1 h-8 w-16 rounded" />
                    <div className="bg-muted h-4 w-20 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="bg-muted h-7 w-36 animate-pulse rounded" />
            <div className="bg-muted h-9 w-20 animate-pulse rounded" />
          </div>

          {/* Posts Skeleton */}
          <PostLoadingSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}
