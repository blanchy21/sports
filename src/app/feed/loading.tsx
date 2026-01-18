import { PostLoadingSkeleton } from "@/components/ui/Loading";

/**
 * Feed Page Loading State
 * 
 * Shows skeleton UI while the feed page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />
      
      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Write Post Section Skeleton */}
          <div className="bg-card border rounded-lg p-4 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="flex-1 h-10 bg-muted rounded-lg" />
              <div className="h-10 w-20 bg-muted rounded-lg" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-muted rounded-lg h-9 w-9" />
                  <div className="flex-1">
                    <div className="h-8 w-16 bg-muted rounded mb-1" />
                    <div className="h-4 w-20 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-7 w-36 bg-muted rounded animate-pulse" />
            <div className="h-9 w-20 bg-muted rounded animate-pulse" />
          </div>

          {/* Posts Skeleton */}
          <PostLoadingSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}
