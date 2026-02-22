/**
 * Communities Page Loading State
 *
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function CommunitiesLoading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Placeholder */}
      <div className="from-primary/10 to-accent/10 h-24 bg-linear-to-r" />

      <div className="lg:pl-80 xl:pr-112">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Header Skeleton */}
          <div className="flex animate-pulse items-center space-x-3">
            <div className="bg-muted h-6 w-6 rounded" />
            <div className="bg-muted h-8 w-36 rounded" />
          </div>

          {/* Communities Grid Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card animate-pulse rounded-lg border p-6"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="mb-4 flex items-center gap-4">
                  <div className="bg-muted h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <div className="bg-muted mb-1 h-5 w-32 rounded" />
                    <div className="bg-muted h-3 w-20 rounded" />
                  </div>
                </div>
                <div className="bg-muted mb-2 h-4 w-full rounded" />
                <div className="bg-muted mb-4 h-4 w-3/4 rounded" />
                <div className="flex gap-4">
                  <div className="bg-muted h-4 w-16 rounded" />
                  <div className="bg-muted h-4 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
