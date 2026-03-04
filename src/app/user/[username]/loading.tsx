export default function UserProfileLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Profile header card */}
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Cover photo */}
        <div className="h-32 animate-pulse bg-gradient-to-r from-muted to-muted/70 sm:h-48" />

        {/* Profile info */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-start sm:space-x-4">
            {/* Avatar */}
            <div className="relative -mt-12 sm:-mt-16">
              <div className="h-24 w-24 animate-pulse rounded-full border-4 border-background bg-muted sm:h-32 sm:w-32" />
            </div>

            <div className="mt-4 flex-1 space-y-3 text-center sm:text-left">
              {/* Name + badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
              </div>

              {/* Username */}
              <div className="h-5 w-28 animate-pulse rounded bg-muted sm:mx-0 mx-auto" />

              {/* Bio */}
              <div className="mt-4 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              </div>

              {/* Stats row */}
              <div className="mt-6 flex items-center justify-center gap-6 border-t border-border pt-4 sm:justify-start">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="mx-auto h-7 w-10 animate-pulse rounded bg-muted" />
                    <div className="mx-auto mt-1 h-4 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges section */}
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="mb-4 h-6 w-20 animate-pulse rounded bg-muted" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>

      {/* Posts section */}
      <div className="rounded-lg border bg-card">
        {/* Tabs */}
        <div className="flex items-center border-b border-border px-4 sm:px-6">
          <div className="h-10 w-16 animate-pulse rounded bg-muted" />
        </div>

        {/* Post cards */}
        <div className="space-y-4 p-4 sm:p-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
