/**
 * Wallet Page Loading State
 * 
 * Shows skeleton UI while the wallet page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function WalletLoading() {
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
              <div className="h-8 w-24 bg-muted rounded" />
            </div>
            <div className="h-10 w-32 bg-muted rounded" />
          </div>

          {/* Balance Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
                <div className="h-4 w-20 bg-muted rounded mb-4" />
                <div className="h-10 w-24 bg-muted rounded mb-2" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>

          {/* Power/Resources Section Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
                <div className="h-5 w-28 bg-muted rounded mb-4" />
                <div className="h-2 w-full bg-muted rounded mb-2" />
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>

          {/* Transactions Section Skeleton */}
          <div className="bg-card border rounded-lg p-6 animate-pulse">
            <div className="h-6 w-40 bg-muted rounded mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-muted rounded-full" />
                    <div>
                      <div className="h-4 w-32 bg-muted rounded mb-1" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
