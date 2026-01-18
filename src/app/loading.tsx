import { PostLoadingSkeleton } from "@/components/ui/Loading";

/**
 * Global Loading State
 * 
 * Shows during route transitions when navigating between pages.
 * This provides instant visual feedback while the new page loads.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Placeholder */}
      <div className="h-24 bg-gradient-to-r from-primary/10 to-accent/10 animate-pulse" />
      
      <div className="flex">
        {/* Left Sidebar Placeholder */}
        <aside className="hidden lg:block lg:w-80 lg:fixed lg:inset-y-0 lg:pt-24 lg:pb-4 lg:border-r bg-background">
          <div className="px-4 py-4 space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-muted rounded-md animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main className="lg:pl-80 xl:pr-[28rem] flex-1">
          <div className="max-w-4xl mx-auto px-6 py-6">
            {/* Page Header Skeleton */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-6 w-6 bg-muted rounded animate-pulse" />
                <div className="h-8 w-40 bg-muted rounded animate-pulse" />
              </div>
            </div>
            
            {/* Posts Skeleton */}
            <PostLoadingSkeleton count={3} />
          </div>
        </main>
        
        {/* Right Sidebar Placeholder */}
        <aside className="hidden xl:block xl:w-[28rem] xl:fixed xl:right-0 xl:inset-y-0 xl:pt-24 xl:pb-4 xl:border-l bg-background">
          <div className="px-6 py-4 space-y-6">
            {/* Upcoming Events Skeleton */}
            <div className="space-y-3">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-muted rounded-lg animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
            
            {/* Trending Topics Skeleton */}
            <div className="space-y-3">
              <div className="h-5 w-36 bg-muted rounded animate-pulse" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 bg-muted rounded animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
