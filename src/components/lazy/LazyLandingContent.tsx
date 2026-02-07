'use client';

import dynamic from 'next/dynamic';

// Loading placeholder for landing page sections
function LandingSectionSkeleton() {
  return (
    <>
      {/* Trust bar skeleton */}
      <div className="border-b border-border/50 bg-muted/30 px-6 py-8">
        <div className="mx-auto flex max-w-6xl animate-pulse items-center justify-center gap-10">
          <div className="h-8 w-32 rounded bg-muted"></div>
          <div className="h-8 w-24 rounded bg-muted"></div>
          <div className="h-8 w-24 rounded bg-muted"></div>
          <div className="h-8 w-24 rounded bg-muted"></div>
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="px-6 py-24">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-16 text-center">
            <div className="mx-auto mb-6 h-12 w-1/2 rounded bg-muted"></div>
            <div className="mx-auto h-6 w-3/4 rounded bg-muted"></div>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border bg-card p-10">
              <div className="mb-4 h-8 w-32 rounded bg-muted"></div>
              <div className="mb-6 h-8 w-3/4 rounded bg-muted"></div>
              <div className="space-y-4">
                <div className="h-6 w-full rounded bg-muted"></div>
                <div className="h-6 w-full rounded bg-muted"></div>
                <div className="h-6 w-full rounded bg-muted"></div>
              </div>
            </div>
            <div className="rounded-3xl border bg-card p-10">
              <div className="mb-4 h-8 w-32 rounded bg-muted"></div>
              <div className="mb-6 h-8 w-3/4 rounded bg-muted"></div>
              <div className="space-y-4">
                <div className="h-6 w-full rounded bg-muted"></div>
                <div className="h-6 w-full rounded bg-muted"></div>
                <div className="h-6 w-full rounded bg-muted"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Lazy load the heavy landing page sections (framer-motion animations)
export const LazyLandingSections = dynamic(() => import('@/components/landing/LandingSections'), {
  ssr: false,
  loading: () => <LandingSectionSkeleton />,
});
