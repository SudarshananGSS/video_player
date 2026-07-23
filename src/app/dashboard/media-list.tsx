"use client";

import { useState } from "react";
import { createShareLink, deleteMedia } from "./actions";

type Target = "original" | "thumbnail";

type Item = {
  id: string;
  type: string;
  title: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  status: string;
  created_at: string;
  previewUrl: string | null;
};

function shareKey(id: string, target: Target) {
  return `${id}:${target}`;
}

export function MediaList({ items }: { items: Item[] }) {
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function handleShare(id: string, target: Target) {
    const key = shareKey(id, target);
    setBusyKey(key);
    const result = await createShareLink(id, target);
    setBusyKey(null);
    if (result.token) {
      const url = `${window.location.origin}/watch/${result.token}`;
      setShareUrls((prev) => ({ ...prev, [key]: url }));
    }
  }

  async function handleCopy(key: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
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
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const notReady = item.status !== "ready";
        return (
          <li key={item.id} className="overflow-hidden rounded-xl border border-neutral-200">
            <div className="relative aspect-video bg-neutral-100">
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
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
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
            </div>

            <div className="space-y-3 p-3">
              <p className="truncate text-sm font-medium" title={item.title ?? undefined}>
                {item.title}
              </p>

              <div className="flex flex-wrap gap-2">
                <ShareButton
                  label="Share video"
                  disabled={notReady}
                  busy={busyKey === shareKey(item.id, "original")}
                  onClick={() => handleShare(item.id, "original")}
                />
                {item.type === "video" && item.thumbnail_path && (
                  <ShareButton
                    label="Share thumbnail"
                    disabled={notReady}
                    busy={busyKey === shareKey(item.id, "thumbnail")}
                    onClick={() => handleShare(item.id, "thumbnail")}
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

              <ShareLinkRow
                url={shareUrls[shareKey(item.id, "original")]}
                label="Video link"
                copied={copiedKey === shareKey(item.id, "original")}
                onCopy={() => handleCopy(shareKey(item.id, "original"), shareUrls[shareKey(item.id, "original")])}
              />
              <ShareLinkRow
                url={shareUrls[shareKey(item.id, "thumbnail")]}
                label="Thumbnail link"
                copied={copiedKey === shareKey(item.id, "thumbnail")}
                onCopy={() =>
                  handleCopy(shareKey(item.id, "thumbnail"), shareUrls[shareKey(item.id, "thumbnail")])
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ShareButton({
  label,
  disabled,
  busy,
  onClick,
}: {
  label: string;
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
      {busy ? "Sharing..." : label}
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

function ShareLinkRow({
  url,
  label,
  copied,
  onCopy,
}: {
  url: string | undefined;
  label: string;
  copied: boolean;
  onCopy: () => void;
}) {
  if (!url) return null;

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-neutral-500">{label}</p>
      <div className="flex gap-1">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="w-full min-w-0 rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
        />
        <button
          onClick={onCopy}
          className="shrink-0 rounded border border-neutral-300 px-2 py-1 text-xs font-medium transition-colors hover:bg-neutral-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
