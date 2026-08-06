"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMedia } from "./actions";
import { setCampaignVideo } from "./advisor-actions";
import { WatchClient } from "@/app/watch/[token]/watch-client";

type Item = {
  id: string;
  type: string;
  title: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  status: string;
  created_at: string;
  previewUrl: string | null;
  videoUrl: string | null;
  shareToken: string | null;
};

export function MediaList({
  items,
  campaignVideoMediaId,
}: {
  items: Item[];
  campaignVideoMediaId: string | null;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingToken, setPlayingToken] = useState<string | null>(null);

  async function handleSetCampaignVideo(id: string) {
    setBusyKey(`campaign:${id}`);
    await setCampaignVideo(id);
    setBusyKey(null);
    router.refresh();
  }

  function handleOpenVideo(item: Item) {
    if (!item.shareToken) return;
    setPlayingToken(item.shareToken);
  }

  async function handleCopy(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  }

  async function handleDelete(item: Item) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    setBusyKey(item.id);
    await deleteMedia(item.id, item.storage_path, item.thumbnail_path);
    setBusyKey(null);
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
        No media uploaded yet.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const notReady = item.status !== "ready";
        return (
          <li key={item.id} className="overflow-hidden rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={() => handleOpenVideo(item)}
              disabled={notReady || !item.shareToken}
              className={`group relative block aspect-video w-full bg-neutral-100 ${notReady || !item.shareToken ? "cursor-not-allowed" : "cursor-pointer"}`}
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
              {notReady && (
                <span className="absolute right-2 top-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {item.status}
                </span>
              )}
            </button>

            <div className="space-y-3 p-3">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium" title={item.title ?? undefined}>
                  {item.title}
                </p>
                {item.type === "video" && item.id === campaignVideoMediaId && (
                  <span className="shrink-0 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Campaign video
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {item.type === "video" && item.id !== campaignVideoMediaId && (
                  <ShareButton
                    label="Set as campaign video"
                    busyLabel="Setting..."
                    disabled={notReady}
                    busy={busyKey === `campaign:${item.id}`}
                    onClick={() => handleSetCampaignVideo(item.id)}
                  />
                )}
                <button
                  disabled={busyKey === item.id}
                  onClick={() => handleDelete(item)}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>

              {item.videoUrl && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-neutral-500">Video link</p>
                  <div className="flex gap-1">
                    <input
                      readOnly
                      value={item.videoUrl}
                      onFocus={(e) => e.target.select()}
                      className="w-full min-w-0 rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
                    />
                    <button
                      onClick={() => handleCopy(item.id, item.videoUrl!)}
                      className="shrink-0 rounded border border-neutral-300 px-2 py-1 text-xs font-medium transition-colors hover:bg-neutral-50"
                    >
                      {copiedId === item.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
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

function ShareButton({
  label,
  busyLabel = "Working...",
  disabled,
  busy,
  onClick,
}: {
  label: string;
  busyLabel?: string;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled || busy}
      onClick={onClick}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-neutral-50 disabled:opacity-50"
    >
      {busy ? busyLabel : label}
    </button>
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
