import { PostLoadingSkeleton } from "@/components/ui/Loading";

/**
 * Discover Page Loading State
 * 
 * Shows skeleton UI while the discover page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />
      
      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center space-x-3 animate-pulse">
            <div className="h-6 w-6 bg-muted rounded" />
            <div className="h-8 w-40 bg-muted rounded" />
          </div>

          {/* Sport Filter Skeleton */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-24 bg-muted rounded animate-pulse"
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </div>

          {/* Trending Posts Header Skeleton */}
          <div className="flex items-center space-x-2 animate-pulse">
            <div className="h-5 w-5 bg-muted rounded" />
            <div className="h-7 w-36 bg-muted rounded" />
          </div>

          {/* Posts Skeleton */}
          <PostLoadingSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
