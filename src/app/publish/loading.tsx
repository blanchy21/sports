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
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="h-6 w-6 bg-muted rounded" />
              <div className="h-8 w-40 bg-muted rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-muted rounded" />
              <div className="h-10 w-24 bg-muted rounded" />
            </div>
          </div>

          {/* Title Input Skeleton */}
          <div className="h-14 w-full bg-muted rounded-lg animate-pulse" />

          {/* Editor Skeleton */}
          <div className="bg-card border rounded-lg animate-pulse">
            <div className="border-b p-2 flex gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 w-8 bg-muted rounded" />
              ))}
            </div>
            <div className="p-4 space-y-3">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
              <div className="h-4 w-4/6 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-40" />
            </div>
          </div>

          {/* Options Skeleton */}
          <div className="bg-card border rounded-lg p-4 animate-pulse">
            <div className="h-5 w-24 bg-muted rounded mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
