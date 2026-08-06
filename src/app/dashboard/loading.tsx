function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-neutral-200 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between border-b border-neutral-200 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>

      <Skeleton className="mb-8 h-32 w-full rounded-lg" />

      <Skeleton className="mb-3 h-4 w-16" />
      <Skeleton className="mb-8 h-40 w-full rounded-xl" />

      <Skeleton className="mb-3 h-4 w-20" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-neutral-200">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-3 p-3">
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
