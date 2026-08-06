function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-neutral-200 ${className}`} />;
}

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-transparent">
              Admin
            </span>
            <Skeleton className="h-4 w-40 bg-white/10" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-28 bg-white/10" />
            <Skeleton className="h-4 w-14 bg-white/10" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="mb-8 h-24 w-full rounded-lg" />
        <Skeleton className="mb-8 h-32 w-full rounded-lg" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
          <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
            <Skeleton className="mb-2 h-3 w-16" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
          <div className="flex items-center justify-center rounded-lg border border-neutral-200 bg-white p-4">
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
    </div>
  );
}
