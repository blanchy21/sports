import { PostLoadingSkeleton } from '@/components/core/Loading';

/**
 * Discover Page Loading State
 *
 * Shows skeleton UI while the discover page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function DiscoverLoading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Placeholder */}
      <div className="from-primary/10 to-accent/10 h-24 bg-linear-to-r" />

      <div className="lg:pl-80 xl:pr-112">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Header Skeleton */}
          <div className="flex animate-pulse items-center space-x-3">
            <div className="bg-muted h-6 w-6 rounded" />
            <div className="bg-muted h-8 w-40 rounded" />
          </div>

          {/* Sport Filter Skeleton */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted h-9 w-24 animate-pulse rounded"
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </div>

          {/* Trending Posts Header Skeleton */}
          <div className="flex animate-pulse items-center space-x-2">
            <div className="bg-muted h-5 w-5 rounded" />
            <div className="bg-muted h-7 w-36 rounded" />
          </div>

          {/* Posts Skeleton */}
          <PostLoadingSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
