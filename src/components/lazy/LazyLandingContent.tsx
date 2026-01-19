"use client";

import dynamic from 'next/dynamic';

// Loading placeholder for landing page sections
function LandingSectionSkeleton() {
  return (
    <div className="py-24 px-6">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="text-center mb-16">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mb-6"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border rounded-xl p-8">
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lazy load the heavy landing page sections (framer-motion animations)
export const LazyLandingSections = dynamic(
  () => import('@/components/landing/LandingSections'),
  {
    ssr: false,
    loading: () => <LandingSectionSkeleton />
  }
);
