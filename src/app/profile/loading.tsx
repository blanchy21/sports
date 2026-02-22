import { PostLoadingSkeleton } from '@/components/core/Loading';

/**
 * Profile Page Loading State
 *
 * Shows skeleton UI while the profile page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />

      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Profile Header Skeleton */}
          <div className="animate-pulse rounded-lg border bg-card p-6">
            <div className="flex flex-col items-start gap-6 md:flex-row">
              <div className="h-24 w-24 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="mb-2 h-8 w-48 rounded bg-muted" />
                <div className="mb-4 h-4 w-32 rounded bg-muted" />
                <div className="mb-4 h-16 w-full rounded bg-muted" />
                <div className="flex gap-4">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                </div>
              </div>
              <div className="h-10 w-28 rounded bg-muted" />
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
                <div className="mb-2 h-4 w-16 rounded bg-muted" />
                <div className="h-8 w-12 rounded bg-muted" />
              </div>
            ))}
          </div>

          {/* Posts Section Skeleton */}
          <div>
            <div className="mb-4 h-6 w-24 animate-pulse rounded bg-muted" />
            <PostLoadingSkeleton count={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
