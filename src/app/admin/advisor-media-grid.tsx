"use client";

import { useState } from "react";
import { WatchClient } from "@/app/watch/[token]/watch-client";

type Item = {
  id: string;
  type: string;
  title: string | null;
  status: string;
  previewUrl: string | null;
  shareToken: string | null;
};

export function AdvisorMediaGrid({
  items,
  campaignVideoMediaId,
}: {
  items: Item[];
  campaignVideoMediaId: string | null;
}) {
  const [playingToken, setPlayingToken] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
        This advisor hasn&apos;t uploaded any media yet.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-xl border border-neutral-200">
            {item.shareToken ? (
              <button
                type="button"
                onClick={() => setPlayingToken(item.shareToken)}
                className="group relative block aspect-video w-full bg-neutral-100"
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
              </button>
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
      {playingToken && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlayingToken(null)}
        >
          <button
            onClick={() => setPlayingToken(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <CloseIcon />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] max-w-4xl items-center justify-center">
            <WatchClient token={playingToken} />
          </div>
        </div>
      )}
    </>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="translate-x-[1px]">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
