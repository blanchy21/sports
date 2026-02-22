import { PostLoadingSkeleton } from '@/components/core/Loading';

/**
 * Profile Page Loading State
 *
 * Shows skeleton UI while the profile page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function ProfileLoading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Placeholder */}
      <div className="from-primary/10 to-accent/10 h-24 bg-linear-to-r" />

      <div className="lg:pl-80 xl:pr-112">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Profile Header Skeleton */}
          <div className="bg-card animate-pulse rounded-lg border p-6">
            <div className="flex flex-col items-start gap-6 md:flex-row">
              <div className="bg-muted h-24 w-24 rounded-full" />
              <div className="flex-1">
                <div className="bg-muted mb-2 h-8 w-48 rounded" />
                <div className="bg-muted mb-4 h-4 w-32 rounded" />
                <div className="bg-muted mb-4 h-16 w-full rounded" />
                <div className="flex gap-4">
                  <div className="bg-muted h-4 w-24 rounded" />
                  <div className="bg-muted h-4 w-24 rounded" />
                  <div className="bg-muted h-4 w-24 rounded" />
                </div>
              </div>
              <div className="bg-muted h-10 w-28 rounded" />
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card animate-pulse rounded-lg border p-4">
                <div className="bg-muted mb-2 h-4 w-16 rounded" />
                <div className="bg-muted h-8 w-12 rounded" />
              </div>
            ))}
          </div>

          {/* Posts Section Skeleton */}
          <div>
            <div className="bg-muted mb-4 h-6 w-24 animate-pulse rounded" />
            <PostLoadingSkeleton count={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
