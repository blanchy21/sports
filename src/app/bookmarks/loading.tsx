import { PostLoadingSkeleton } from "@/components/ui/Loading";

/**
 * Bookmarks Page Loading State
 * 
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function BookmarksLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />
      
      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center space-x-3 animate-pulse">
            <div className="h-6 w-6 bg-muted rounded" />
            <div className="h-8 w-32 bg-muted rounded" />
          </div>

          {/* Posts Skeleton */}
          <PostLoadingSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
