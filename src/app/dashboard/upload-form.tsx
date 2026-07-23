"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateVideoThumbnail } from "@/lib/video-thumbnail";

type ThumbnailMode = "auto" | "custom" | "none";

export function UploadForm({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [thumbnailMode, setThumbnailMode] = useState<ThumbnailMode>("auto");
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);

  function resetPendingVideo() {
    setPendingVideo(null);
    setThumbnailMode("auto");
    setCustomThumbnail(null);
    if (inputRef.current) inputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }

  async function uploadThumbnail(
    supabase: ReturnType<typeof createClient>,
    mediaId: string,
    video: File,
  ): Promise<string | null> {
    if (thumbnailMode === "none") return null;

    try {
      const blob =
        thumbnailMode === "custom" && customThumbnail
          ? customThumbnail
          : await generateVideoThumbnail(video);

      const ext = thumbnailMode === "custom" && customThumbnail ? customThumbnail.name.split(".").pop() : "jpg";
      const thumbPath = `${ownerId}/${mediaId}/thumbnail.${ext || "jpg"}`;
      const contentType = thumbnailMode === "custom" && customThumbnail ? customThumbnail.type : "image/jpeg";

      const { error } = await supabase.storage.from("media").upload(thumbPath, blob, { contentType });
      return error ? null : thumbPath;
    } catch {
      // Thumbnail is best-effort; the video itself already uploaded fine.
      return null;
    }
  }

  async function handleImageUpload(file: File) {
    const supabase = createClient();
    setBusy(true);
    setStatus("Uploading...");

    const mediaId = crypto.randomUUID();
    const path = `${ownerId}/${mediaId}/${file.name}`;

    const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
    if (uploadError) {
      setStatus(`Upload failed: ${uploadError.message}`);
      setBusy(false);
      return;
    }

    await insertMediaRow(supabase, {
      mediaId,
      type: "image",
      file,
      path,
      thumbnailPath: null,
    });
  }

  async function handleVideoUpload() {
    if (!pendingVideo) return;
    if (thumbnailMode === "custom" && !customThumbnail) {
      setStatus("Choose a thumbnail image, or switch to auto-generate.");
      return;
    }

    const supabase = createClient();
    const file = pendingVideo;
    setBusy(true);
    setStatus("Uploading video...");

    const mediaId = crypto.randomUUID();
    const path = `${ownerId}/${mediaId}/${file.name}`;

    const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
    if (uploadError) {
      setStatus(`Upload failed: ${uploadError.message}`);
      setBusy(false);
      return;
    }

    if (thumbnailMode !== "none") {
      setStatus(thumbnailMode === "custom" ? "Uploading thumbnail..." : "Generating thumbnail...");
    }
    const thumbnailPath = await uploadThumbnail(supabase, mediaId, file);

    setStatus("Saving...");
    await insertMediaRow(supabase, {
      mediaId,
      type: "video",
      file,
      path,
      thumbnailPath,
    });
    resetPendingVideo();
  }

  async function insertMediaRow(
    supabase: ReturnType<typeof createClient>,
    opts: { mediaId: string; type: "video" | "image"; file: File; path: string; thumbnailPath: string | null },
  ) {
    const { error: insertError } = await supabase.from("media").insert({
      id: opts.mediaId,
      owner_id: ownerId,
      type: opts.type,
      title: opts.file.name,
      storage_path: opts.path,
      thumbnail_path: opts.thumbnailPath,
      mime_type: opts.file.type,
      size_bytes: opts.file.size,
      status: "ready",
    });

    if (insertError) {
      setStatus(`Saved file but failed to record it: ${insertError.message}`);
      setBusy(false);
      return;
    }

    setStatus("Done.");
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  function handleFileSelect(file: File) {
    if (file.type.startsWith("video/")) {
      setPendingVideo(file);
      setThumbnailMode("auto");
      setCustomThumbnail(null);
      setStatus(null);
      return;
    }
    if (file.type.startsWith("image/")) {
      handleImageUpload(file);
      return;
    }
    setStatus("Only image and video files are supported.");
  }

  const isError = status?.toLowerCase().includes("fail") || status?.toLowerCase().includes("choose");

  return (
    <div className="mb-8 rounded-lg border border-dashed border-neutral-300 p-6 text-center transition-colors hover:border-neutral-400">
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="text-sm"
      />
      <p className="mt-1 text-xs text-neutral-400">Videos and images, up to 50MB.</p>

      {pendingVideo && (
        <div className="mt-4 space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4 text-left">
          <p className="text-sm font-medium">{pendingVideo.name}</p>

          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-500">Thumbnail</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="thumbnailMode"
                checked={thumbnailMode === "auto"}
                onChange={() => setThumbnailMode("auto")}
                disabled={busy}
              />
              Auto-generate from video
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="thumbnailMode"
                checked={thumbnailMode === "custom"}
                onChange={() => setThumbnailMode("custom")}
                disabled={busy}
              />
              Upload my own image
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="thumbnailMode"
                checked={thumbnailMode === "none"}
                onChange={() => setThumbnailMode("none")}
                disabled={busy}
              />
              No thumbnail
            </label>

            {thumbnailMode === "custom" && (
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => setCustomThumbnail(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVideoUpload}
              disabled={busy}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Upload video
            </button>
            <button
              onClick={resetPendingVideo}
              disabled={busy}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status && (
        <p className={`mt-2 text-sm ${isError ? "text-red-600" : "text-neutral-500"}`}>{status}</p>
      )}
    </div>
  );
}
