/**
 * Wallet Page Loading State
 *
 * Shows skeleton UI while the wallet page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function WalletLoading() {
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
              <div className="bg-muted h-8 w-24 rounded" />
            </div>
            <div className="bg-muted h-10 w-32 rounded" />
          </div>

          {/* Balance Cards Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card animate-pulse rounded-lg border p-6">
                <div className="bg-muted mb-4 h-4 w-20 rounded" />
                <div className="bg-muted mb-2 h-10 w-24 rounded" />
                <div className="bg-muted h-3 w-16 rounded" />
              </div>
            ))}
          </div>

          {/* Power/Resources Section Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-card animate-pulse rounded-lg border p-6">
                <div className="bg-muted mb-4 h-5 w-28 rounded" />
                <div className="bg-muted mb-2 h-2 w-full rounded" />
                <div className="bg-muted h-4 w-20 rounded" />
              </div>
            ))}
          </div>

          {/* Transactions Section Skeleton */}
          <div className="bg-card animate-pulse rounded-lg border p-6">
            <div className="bg-muted mb-4 h-6 w-40 rounded" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-muted h-10 w-10 rounded-full" />
                    <div>
                      <div className="bg-muted mb-1 h-4 w-32 rounded" />
                      <div className="bg-muted h-3 w-24 rounded" />
                    </div>
                  </div>
                  <div className="bg-muted h-5 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
