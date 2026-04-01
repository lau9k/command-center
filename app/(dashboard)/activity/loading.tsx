export default function ActivityLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Timeline skeleton */}
      <div className="space-y-8">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="relative ml-4">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="relative flex gap-4">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-muted ring-4 ring-background" />
                  </div>
                  <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="flex gap-2">
                          <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
                          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
