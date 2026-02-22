/**
 * Publish Page Loading State
 *
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function PublishLoading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Placeholder */}
      <div className="from-primary/10 to-accent/10 h-24 bg-linear-to-r" />

      <div className="lg:pl-80">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Header Skeleton */}
          <div className="flex animate-pulse items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-muted h-6 w-6 rounded" />
              <div className="bg-muted h-8 w-40 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="bg-muted h-10 w-24 rounded" />
              <div className="bg-muted h-10 w-24 rounded" />
            </div>
          </div>

          {/* Title Input Skeleton */}
          <div className="bg-muted h-14 w-full animate-pulse rounded-lg" />

          {/* Editor Skeleton */}
          <div className="bg-card animate-pulse rounded-lg border">
            <div className="flex gap-2 border-b p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-muted h-8 w-8 rounded" />
              ))}
            </div>
            <div className="space-y-3 p-4">
              <div className="bg-muted h-4 w-full rounded" />
              <div className="bg-muted h-4 w-5/6 rounded" />
              <div className="bg-muted h-4 w-4/6 rounded" />
              <div className="bg-muted h-4 w-full rounded" />
              <div className="bg-muted h-4 w-3/4 rounded" />
              <div className="h-40" />
            </div>
          </div>

          {/* Options Skeleton */}
          <div className="bg-card animate-pulse rounded-lg border p-4">
            <div className="bg-muted mb-4 h-5 w-24 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted h-10 rounded" />
              <div className="bg-muted h-10 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
