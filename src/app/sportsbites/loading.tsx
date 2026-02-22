/**
 * Sportsbites Page Loading State
 *
 * Shows skeleton UI while the sportsbites page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function SportsBitesLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />

      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="mx-auto max-w-2xl px-6 py-6">
          {/* Header Skeleton */}
          <div className="mb-4 border-b border-border/50 py-4">
            <div className="mb-4 flex animate-pulse items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-muted" />
                <div>
                  <div className="mb-1 h-7 w-28 rounded bg-muted" />
                  <div className="h-4 w-40 rounded bg-muted" />
                </div>
              </div>
              <div className="h-8 w-16 rounded-full bg-muted" />
            </div>

            {/* Filter Tabs Skeleton */}
            <div className="flex gap-1.5 pb-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 flex-1 animate-pulse rounded-md bg-muted"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Compose Box Skeleton */}
          <div className="mb-6 animate-pulse rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="mb-3 h-20 rounded-lg bg-muted" />
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-9 w-20 rounded-lg bg-muted" />
                </div>
              </div>
            </div>
          </div>

          {/* Feed Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border bg-card p-4"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="mb-1 h-4 w-24 rounded bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                  </div>
                </div>
                <div className="mb-3 space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-5/6 rounded bg-muted" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-8 w-16 rounded bg-muted" />
                  <div className="h-8 w-16 rounded bg-muted" />
                  <div className="h-8 w-16 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
