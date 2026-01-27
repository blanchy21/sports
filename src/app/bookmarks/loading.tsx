import { PostLoadingSkeleton } from '@/components/core/Loading';

/**
 * Bookmarks Page Loading State
 *
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function BookmarksLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />

      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Header Skeleton */}
          <div className="flex animate-pulse items-center space-x-3">
            <div className="h-6 w-6 rounded bg-muted" />
            <div className="h-8 w-32 rounded bg-muted" />
          </div>

          {/* Posts Skeleton */}
          <PostLoadingSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
