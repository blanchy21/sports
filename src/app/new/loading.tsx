import { PostLoadingSkeleton } from "@/components/ui/Loading";

/**
 * New Posts Page Loading State
 * 
 * Shows skeleton UI while the new posts page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function NewPostsLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />
      
      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="h-6 w-6 bg-muted rounded" />
              <div className="h-8 w-32 bg-muted rounded" />
            </div>
            <div className="h-9 w-20 bg-muted rounded" />
          </div>

          {/* Posts Skeleton */}
          <PostLoadingSkeleton count={5} />
        </div>
      </div>
    </div>
  );
}
