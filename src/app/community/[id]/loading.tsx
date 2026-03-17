export default function CommunityLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Community header card */}
      <div className="animate-pulse rounded-lg border bg-sb-stadium p-6">
        <div className="mb-6 flex items-center space-x-4">
          {/* Community avatar */}
          <div className="h-20 w-20 rounded-full bg-sb-turf" />
          <div className="flex-1 space-y-2">
            {/* Community name */}
            <div className="h-8 w-1/3 rounded bg-sb-turf" />
            {/* Subtitle / type */}
            <div className="h-4 w-1/4 rounded bg-sb-turf" />
            {/* Description */}
            <div className="h-4 w-1/2 rounded bg-sb-turf" />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 border-t border-sb-border pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto h-6 w-12 rounded bg-sb-turf" />
              <div className="mx-auto mt-1 h-4 w-16 rounded bg-sb-turf" />
            </div>
          ))}
          <div className="ml-auto h-9 w-24 rounded-lg bg-sb-turf" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-sb-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-20 animate-pulse rounded bg-sb-turf" />
        ))}
      </div>

      {/* Feed grid */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border bg-sb-stadium p-4">
            {/* Post header */}
            <div className="mb-3 flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-sb-turf" />
              <div className="space-y-1">
                <div className="h-4 w-28 rounded bg-sb-turf" />
                <div className="h-3 w-20 rounded bg-sb-turf" />
              </div>
            </div>
            {/* Post title */}
            <div className="mb-2 h-5 w-3/4 rounded bg-sb-turf" />
            {/* Post body preview */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-sb-turf" />
              <div className="h-4 w-5/6 rounded bg-sb-turf" />
            </div>
            {/* Post footer */}
            <div className="mt-3 flex items-center space-x-4">
              <div className="h-4 w-16 rounded bg-sb-turf" />
              <div className="h-4 w-20 rounded bg-sb-turf" />
              <div className="h-4 w-16 rounded bg-sb-turf" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
