"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateVideoThumbnail } from "@/lib/video-thumbnail";

export function UploadForm({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleUpload(file: File) {
    const supabase = createClient();
    const type = file.type.startsWith("video/") ? "video" : "image";

    if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) {
      setStatus("Only image and video files are supported.");
      return;
    }

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

    let thumbnailPath: string | null = null;

    if (type === "video") {
      setStatus("Generating thumbnail...");
      try {
        const thumbnailBlob = await generateVideoThumbnail(file);
        const thumbPath = `${ownerId}/${mediaId}/thumbnail.jpg`;
        const { error: thumbnailError } = await supabase.storage
          .from("media")
          .upload(thumbPath, thumbnailBlob, { contentType: "image/jpeg" });
        if (!thumbnailError) thumbnailPath = thumbPath;
      } catch {
        // Thumbnail is best-effort; the video itself already uploaded fine.
      }
      setStatus("Uploading...");
    }

    const { error: insertError } = await supabase.from("media").insert({
      id: mediaId,
      owner_id: ownerId,
      type,
      title: file.name,
      storage_path: path,
      thumbnail_path: thumbnailPath,
      mime_type: file.type,
      size_bytes: file.size,
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

  const isError = status?.toLowerCase().includes("fail");

  return (
    <div className="mb-8 rounded-lg border border-dashed border-neutral-300 p-6 text-center transition-colors hover:border-neutral-400">
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        className="text-sm"
      />
      <p className="mt-1 text-xs text-neutral-400">Videos and images, up to 50MB.</p>
      {status && (
        <p className={`mt-2 text-sm ${isError ? "text-red-600" : "text-neutral-500"}`}>{status}</p>
      )}
    </div>
  );
}
