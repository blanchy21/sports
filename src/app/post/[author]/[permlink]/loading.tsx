export default function PostDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Back button */}
      <div className="mb-6 h-9 w-20 animate-pulse rounded-md bg-muted" />

      {/* Author bar */}
      <div className="mb-8">
        <div className="mb-4 flex items-center space-x-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="flex items-center space-x-3">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6 space-y-2">
          <div className="h-9 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-9 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Content paragraphs */}
      <div className="mb-8 space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
        </div>
        {/* Image placeholder */}
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t pt-6">
        <div className="flex items-center space-x-6">
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Comments section */}
      <div className="mt-8 space-y-4">
        <div className="h-6 w-28 animate-pulse rounded bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex space-x-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
