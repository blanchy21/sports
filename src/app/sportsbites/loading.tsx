/**
 * Sportsbites Page Loading State
 *
 * Shows skeleton UI while the sportsbites page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function SportsBitesLoading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Placeholder */}
      <div className="from-primary/10 to-accent/10 h-24 bg-linear-to-r" />

      <div className="lg:pl-80 xl:pr-112">
        <div className="mx-auto max-w-2xl px-6 py-6">
          {/* Header Skeleton */}
          <div className="border-border/50 mb-4 border-b py-4">
            <div className="mb-4 flex animate-pulse items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-muted h-11 w-11 rounded-xl" />
                <div>
                  <div className="bg-muted mb-1 h-7 w-28 rounded" />
                  <div className="bg-muted h-4 w-40 rounded" />
                </div>
              </div>
              <div className="bg-muted h-8 w-16 rounded-full" />
            </div>

            {/* Filter Tabs Skeleton */}
            <div className="flex gap-1.5 pb-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted h-9 flex-1 animate-pulse rounded-md"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Compose Box Skeleton */}
          <div className="bg-card mb-6 animate-pulse rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted h-10 w-10 rounded-full" />
              <div className="flex-1">
                <div className="bg-muted mb-3 h-20 rounded-lg" />
                <div className="flex items-center justify-between">
                  <div className="bg-muted h-4 w-24 rounded" />
                  <div className="bg-muted h-9 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Feed Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-card animate-pulse rounded-xl border p-4"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className="bg-muted h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <div className="bg-muted mb-1 h-4 w-24 rounded" />
                    <div className="bg-muted h-3 w-16 rounded" />
                  </div>
                </div>
                <div className="mb-3 space-y-2">
                  <div className="bg-muted h-4 w-full rounded" />
                  <div className="bg-muted h-4 w-5/6 rounded" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-muted h-8 w-16 rounded" />
                  <div className="bg-muted h-8 w-16 rounded" />
                  <div className="bg-muted h-8 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
