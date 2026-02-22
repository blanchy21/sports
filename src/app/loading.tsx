import { PostLoadingSkeleton } from '@/components/core/Loading';

/**
 * Global Loading State
 *
 * Shows during route transitions when navigating between pages.
 * This provides instant visual feedback while the new page loads.
 */
export default function Loading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Placeholder */}
      <div className="from-primary/10 to-accent/10 h-24 animate-pulse bg-linear-to-r" />

      <div className="flex">
        {/* Left Sidebar Placeholder */}
        <aside className="bg-background hidden lg:fixed lg:inset-y-0 lg:block lg:w-80 lg:border-r lg:pt-24 lg:pb-4">
          <div className="space-y-2 px-4 py-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted h-12 animate-pulse rounded-md"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-80 xl:pr-112">
          <div className="mx-auto max-w-4xl px-6 py-6">
            {/* Page Header Skeleton */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-muted h-6 w-6 animate-pulse rounded" />
                <div className="bg-muted h-8 w-40 animate-pulse rounded" />
              </div>
            </div>

            {/* Posts Skeleton */}
            <PostLoadingSkeleton count={3} />
          </div>
        </main>

        {/* Right Sidebar Placeholder */}
        <aside className="bg-background hidden xl:fixed xl:inset-y-0 xl:right-0 xl:block xl:w-md xl:border-l xl:pt-24 xl:pb-4">
          <div className="space-y-6 px-6 py-4">
            {/* Upcoming Events Skeleton */}
            <div className="space-y-3">
              <div className="bg-muted h-5 w-32 animate-pulse rounded" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted h-20 animate-pulse rounded-lg"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>

            {/* Trending Topics Skeleton */}
            <div className="space-y-3">
              <div className="bg-muted h-5 w-36 animate-pulse rounded" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted h-8 animate-pulse rounded"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
