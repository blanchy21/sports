import { MainLayout } from '@/components/layout/MainLayout';

export default function ContestsLoading() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="h-10 w-48 bg-muted/50 animate-pulse rounded-lg mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
