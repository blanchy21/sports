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
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-muted rounded-full" />
              <div>
                <div className="h-8 w-40 bg-muted rounded mb-2" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            </div>
            <div className="h-10 w-32 bg-muted rounded" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-8 w-8 bg-muted rounded" />
                </div>
                <div className="h-10 w-16 bg-muted rounded mb-2" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>

          {/* Rewards Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-8 w-8 bg-muted rounded" />
                </div>
                <div className="h-10 w-20 bg-muted rounded mb-2" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>

          {/* Recent Posts Section Skeleton */}
          <div className="bg-card border rounded-lg p-6 animate-pulse">
            <div className="h-6 w-32 bg-muted rounded mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-muted rounded" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
