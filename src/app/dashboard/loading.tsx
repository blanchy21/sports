/**
 * Dashboard Page Loading State
 *
 * Shows skeleton UI while the dashboard page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />

      <div className="lg:pl-80">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
          {/* Header Skeleton */}
          <div className="flex animate-pulse items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-sb-turf" />
              <div>
                <div className="mb-2 h-8 w-40 rounded bg-sb-turf" />
                <div className="h-4 w-24 rounded bg-sb-turf" />
              </div>
            </div>
            <div className="h-10 w-32 rounded bg-sb-turf" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-sb-stadium p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-4 w-20 rounded bg-sb-turf" />
                  <div className="h-8 w-8 rounded bg-sb-turf" />
                </div>
                <div className="mb-2 h-10 w-16 rounded bg-sb-turf" />
                <div className="h-3 w-24 rounded bg-sb-turf" />
              </div>
            ))}
          </div>

          {/* Rewards Stats Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-sb-stadium p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="h-4 w-24 rounded bg-sb-turf" />
                  <div className="h-8 w-8 rounded bg-sb-turf" />
                </div>
                <div className="mb-2 h-10 w-20 rounded bg-sb-turf" />
                <div className="h-3 w-20 rounded bg-sb-turf" />
              </div>
            ))}
          </div>

          {/* Recent Posts Section Skeleton */}
          <div className="animate-pulse rounded-lg border bg-sb-stadium p-6">
            <div className="mb-4 h-6 w-32 rounded bg-sb-turf" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded bg-sb-turf" />
                  <div className="flex-1">
                    <div className="mb-2 h-4 w-3/4 rounded bg-sb-turf" />
                    <div className="h-3 w-1/2 rounded bg-sb-turf" />
                  </div>
                  <div className="h-4 w-16 rounded bg-sb-turf" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
