export default function ActivityLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Feed skeleton */}
      <div className="space-y-6">
        <div>
          <div className="mb-2 px-4">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="flex gap-2">
                    <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
                    <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
