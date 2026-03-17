import { MainLayout } from '@/components/layout/MainLayout';

export default function ContestsLoading() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-6 h-10 w-48 animate-pulse rounded-lg bg-sb-turf/50" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg bg-sb-turf/50" />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
