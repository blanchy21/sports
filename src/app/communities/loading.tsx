/**
 * Communities Page Loading State
 * 
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function CommunitiesLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />
      
      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center space-x-3 animate-pulse">
            <div className="h-6 w-6 bg-muted rounded" />
            <div className="h-8 w-36 bg-muted rounded" />
          </div>

          {/* Communities Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border rounded-lg p-6 animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-muted rounded mb-1" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-muted rounded mb-2" />
                <div className="h-4 w-3/4 bg-muted rounded mb-4" />
                <div className="flex gap-4">
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
