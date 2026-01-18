/**
 * Shorts Page Loading State
 * 
 * Shows skeleton UI while the shorts page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function ShortsLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />
      
      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="max-w-2xl mx-auto px-6 py-6">
          {/* Header Skeleton */}
          <div className="mb-4 py-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 bg-muted rounded-xl" />
                <div>
                  <div className="h-7 w-20 bg-muted rounded mb-1" />
                  <div className="h-4 w-36 bg-muted rounded" />
                </div>
              </div>
              <div className="h-8 w-16 bg-muted rounded-full" />
            </div>

            {/* Filter Tabs Skeleton */}
            <div className="flex gap-1.5 pb-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-9 bg-muted rounded-md animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Compose Box Skeleton */}
          <div className="mb-6 bg-card border rounded-xl p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="flex-1">
                <div className="h-20 bg-muted rounded-lg mb-3" />
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-9 w-20 bg-muted rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Shorts Feed Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border rounded-xl p-4 animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded mb-1" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-5/6 bg-muted rounded" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-8 w-16 bg-muted rounded" />
                  <div className="h-8 w-16 bg-muted rounded" />
                  <div className="h-8 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
