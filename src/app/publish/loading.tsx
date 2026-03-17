/**
 * Publish Page Loading State
 *
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function PublishLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />

      <div className="lg:pl-80">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Header Skeleton */}
          <div className="flex animate-pulse items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-6 w-6 rounded bg-sb-turf" />
              <div className="h-8 w-40 rounded bg-sb-turf" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 rounded bg-sb-turf" />
              <div className="h-10 w-24 rounded bg-sb-turf" />
            </div>
          </div>

          {/* Title Input Skeleton */}
          <div className="h-14 w-full animate-pulse rounded-lg bg-sb-turf" />

          {/* Editor Skeleton */}
          <div className="animate-pulse rounded-lg border bg-sb-stadium">
            <div className="flex gap-2 border-b p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 w-8 rounded bg-sb-turf" />
              ))}
            </div>
            <div className="space-y-3 p-4">
              <div className="h-4 w-full rounded bg-sb-turf" />
              <div className="h-4 w-5/6 rounded bg-sb-turf" />
              <div className="h-4 w-4/6 rounded bg-sb-turf" />
              <div className="h-4 w-full rounded bg-sb-turf" />
              <div className="h-4 w-3/4 rounded bg-sb-turf" />
              <div className="h-40" />
            </div>
          </div>

          {/* Options Skeleton */}
          <div className="animate-pulse rounded-lg border bg-sb-stadium p-4">
            <div className="mb-4 h-5 w-24 rounded bg-sb-turf" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 rounded bg-sb-turf" />
              <div className="h-10 rounded bg-sb-turf" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
