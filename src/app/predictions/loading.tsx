export default function PredictionsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {/* Filter tabs skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>

        {/* Prediction card skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border bg-card p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                </div>
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="space-y-2">
                  <div className="h-8 w-full rounded bg-muted" />
                  <div className="h-8 w-full rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
