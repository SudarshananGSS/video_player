type Item = {
  id: string;
  type: string;
  title: string | null;
  status: string;
  previewUrl: string | null;
  videoUrl: string | null;
};

export function AdvisorMediaGrid({
  items,
  campaignVideoMediaId,
}: {
  items: Item[];
  campaignVideoMediaId: string | null;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
        This advisor hasn&apos;t uploaded any media yet.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.id} className="overflow-hidden rounded-xl border border-neutral-200">
          {item.videoUrl ? (
            <a
              href={item.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-video bg-neutral-100"
            >
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt={item.title ?? ""} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                  {item.type}
                </div>
              )}
              {item.type === "video" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-transform group-hover:scale-105">
                    <PlayIcon />
                  </span>
                </div>
              )}
              <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                {item.type}
              </span>
            </a>
          ) : (
            <div className="relative aspect-video bg-neutral-100">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt={item.title ?? ""} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                  {item.type}
                </div>
              )}
              <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                {item.type}
              </span>
              {item.status !== "ready" && (
                <span className="absolute right-2 top-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {item.status}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 p-3">
            <p className="truncate text-sm font-medium" title={item.title ?? undefined}>
              {item.title}
            </p>
            {item.id === campaignVideoMediaId && (
              <span className="shrink-0 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Campaign video
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="translate-x-[1px]">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
