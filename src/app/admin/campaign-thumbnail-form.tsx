"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { removeCampaignThumbnail, setCampaignThumbnail } from "./actions";

export function CampaignThumbnailForm({ currentThumbnailUrl }: { currentThumbnailUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await setCampaignThumbnail(formData);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    const result = await removeCampaignThumbnail();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-sm font-medium">Campaign thumbnail</p>
      <p className="mt-1 text-xs text-neutral-500">
        {currentThumbnailUrl
          ? "Applies to every advisor's campaign link. Served exactly as uploaded, no play button added."
          : "Not set — each advisor's campaign thumbnail is currently auto-generated from their own video."}
      </p>

      <div className="mt-3 flex items-center gap-3">
        {currentThumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentThumbnailUrl}
            alt="Global campaign thumbnail"
            className="h-14 w-24 shrink-0 rounded-md border border-neutral-200 object-cover"
          />
        )}
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor="global-campaign-thumbnail-upload"
            className="inline-block cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
          >
            {busy ? "Working..." : currentThumbnailUrl ? "Replace" : "Upload"}
          </label>
          <input
            id="global-campaign-thumbnail-upload"
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="sr-only"
          />
          {currentThumbnailUrl && (
            <button
              onClick={handleRemove}
              disabled={busy}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
