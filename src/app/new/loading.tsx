import { PostLoadingSkeleton } from '@/components/core/Loading';

/**
 * New Posts Page Loading State
 *
 * Shows skeleton UI while the new posts page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function NewPostsLoading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Placeholder */}
      <div className="from-primary/10 to-accent/10 h-24 bg-linear-to-r" />

      <div className="lg:pl-80 xl:pr-112">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Header Skeleton */}
          <div className="flex animate-pulse items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-muted h-6 w-6 rounded" />
              <div className="bg-muted h-8 w-32 rounded" />
            </div>
            <div className="bg-muted h-9 w-20 rounded" />
          </div>

          {/* Posts Skeleton */}
          <PostLoadingSkeleton count={5} />
        </div>
      </div>
    </div>
  );
}
