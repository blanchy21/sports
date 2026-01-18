import { PostLoadingSkeleton } from "@/components/ui/Loading";

/**
 * Profile Page Loading State
 * 
 * Shows skeleton UI while the profile page loads.
 * Note: Does NOT use MainLayout to avoid context dependency issues.
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10" />
      
      <div className="lg:pl-80 xl:pr-[28rem]">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Profile Header Skeleton */}
          <div className="bg-card border rounded-lg p-6 animate-pulse">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="h-24 w-24 bg-muted rounded-full" />
              <div className="flex-1">
                <div className="h-8 w-48 bg-muted rounded mb-2" />
                <div className="h-4 w-32 bg-muted rounded mb-4" />
                <div className="h-16 w-full bg-muted rounded mb-4" />
                <div className="flex gap-4">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </div>
              <div className="h-10 w-28 bg-muted rounded" />
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
                <div className="h-4 w-16 bg-muted rounded mb-2" />
                <div className="h-8 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>

          {/* Posts Section Skeleton */}
          <div>
            <div className="h-6 w-24 bg-muted rounded mb-4 animate-pulse" />
            <PostLoadingSkeleton count={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
