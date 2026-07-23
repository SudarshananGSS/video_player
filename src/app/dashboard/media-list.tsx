"use client";

import { useState } from "react";
import { createShareLink, deleteMedia } from "./actions";

type Item = {
  id: string;
  type: string;
  title: string | null;
  storage_path: string;
  status: string;
  created_at: string;
  previewUrl: string | null;
};

export function MediaList({ items }: { items: Item[] }) {
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleShare(id: string) {
    setBusyId(id);
    const result = await createShareLink(id);
    setBusyId(null);
    if (result.token) {
      const url = `${window.location.origin}/watch/${result.token}`;
      setShareUrls((prev) => ({ ...prev, [id]: url }));
    }
  }

  async function handleDelete(id: string, storagePath: string) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    setBusyId(id);
    await deleteMedia(id, storagePath);
    setBusyId(null);
  }

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No media uploaded yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-4 rounded-lg border border-neutral-200 p-3">
          <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded bg-neutral-100 text-xs text-neutral-400">
            {item.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.previewUrl} alt={item.title ?? ""} className="h-full w-full object-cover" />
            ) : (
              item.type
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="text-xs text-neutral-400">{item.status}</p>
            {shareUrls[item.id] && (
              <input
                readOnly
                value={shareUrls[item.id]}
                onFocus={(e) => e.target.select()}
                className="mt-1 w-full rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
              />
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              disabled={busyId === item.id || item.status !== "ready"}
              onClick={() => handleShare(item.id)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Share
            </button>
            <button
              disabled={busyId === item.id}
              onClick={() => handleDelete(item.id, item.storage_path)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
