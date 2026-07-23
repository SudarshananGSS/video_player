"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateVideoThumbnail } from "@/lib/video-thumbnail";

type ThumbnailMode = "auto" | "custom" | "none";
type StatusKind = "info" | "success" | "error";

const THUMBNAIL_OPTIONS: { mode: ThumbnailMode; label: string; hint: string }[] = [
  { mode: "auto", label: "Auto-generate", hint: "Grab a frame from the video" },
  { mode: "custom", label: "Upload my own", hint: "Use a custom image" },
  { mode: "none", label: "No thumbnail", hint: "Show a placeholder" },
];

export function UploadForm({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ text: string; kind: StatusKind } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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
    setStatus({ text: `Uploading ${file.name}...`, kind: "info" });

    const mediaId = crypto.randomUUID();
    const path = `${ownerId}/${mediaId}/${file.name}`;

    const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
    if (uploadError) {
      setStatus({ text: `Upload failed: ${uploadError.message}`, kind: "error" });
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
      setStatus({ text: "Choose a thumbnail image, or switch to auto-generate.", kind: "error" });
      return;
    }

    const supabase = createClient();
    const file = pendingVideo;
    setBusy(true);
    setStatus({ text: "Uploading video...", kind: "info" });

    const mediaId = crypto.randomUUID();
    const path = `${ownerId}/${mediaId}/${file.name}`;

    const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
    if (uploadError) {
      setStatus({ text: `Upload failed: ${uploadError.message}`, kind: "error" });
      setBusy(false);
      return;
    }

    if (thumbnailMode !== "none") {
      setStatus({
        text: thumbnailMode === "custom" ? "Uploading thumbnail..." : "Generating thumbnail...",
        kind: "info",
      });
    }
    const thumbnailPath = await uploadThumbnail(supabase, mediaId, file);

    setStatus({ text: "Saving...", kind: "info" });
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
      setStatus({ text: `Saved file but failed to record it: ${insertError.message}`, kind: "error" });
      setBusy(false);
      return;
    }

    setStatus({ text: `${opts.file.name} uploaded successfully.`, kind: "success" });
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
    setStatus({ text: "Only image and video files are supported.", kind: "error" });
  }

  return (
    <div className="mb-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (busy) return;
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragActive ? "border-neutral-900 bg-neutral-50" : "border-neutral-300 hover:border-neutral-400"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <UploadIcon />
          </span>
          <span className="text-sm font-medium">
            Click to upload <span className="font-normal text-neutral-400">or drag and drop</span>
          </span>
          <span className="text-xs text-neutral-400">Video or image, up to 50MB</span>
        </label>
        <input
          id="file-upload"
          ref={inputRef}
          type="file"
          accept="video/*,image/*"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="sr-only"
        />
      </div>

      {pendingVideo && (
        <div className="mt-3 space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left">
          <p className="truncate text-sm font-medium" title={pendingVideo.name}>
            {pendingVideo.name}
          </p>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Thumbnail
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {THUMBNAIL_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  disabled={busy}
                  onClick={() => setThumbnailMode(option.mode)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors disabled:opacity-50 ${
                    thumbnailMode === option.mode
                      ? "border-neutral-900 bg-white ring-1 ring-neutral-900"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-neutral-400">{option.hint}</span>
                </button>
              ))}
            </div>

            {thumbnailMode === "custom" && (
              <div className="mt-3">
                <label
                  htmlFor="thumbnail-upload"
                  className="inline-block cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
                >
                  {customThumbnail ? customThumbnail.name : "Choose image"}
                </label>
                <input
                  id="thumbnail-upload"
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => setCustomThumbnail(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVideoUpload}
              disabled={busy}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              {busy ? "Uploading..." : "Upload video"}
            </button>
            <button
              onClick={resetPendingVideo}
              disabled={busy}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
            status.kind === "error"
              ? "bg-red-50 text-red-700"
              : status.kind === "success"
                ? "bg-green-50 text-green-700"
                : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {status.kind === "error" ? <ErrorIcon /> : status.kind === "success" ? <CheckIcon /> : <Spinner />}
          <span>{status.text}</span>
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
