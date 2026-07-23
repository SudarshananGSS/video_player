// Grabs a frame from a video file as a JPEG blob, entirely in the browser.
// Used in place of a server-side transcoding pipeline for the MVP.
export function generateVideoThumbnail(file: File, timeoutMs = 8000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out generating thumbnail"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      video.remove();
    }

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(1, video.duration / 2 || 0);
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx || canvas.width === 0 || canvas.height === 0) {
        cleanup();
        reject(new Error("Could not draw video frame"));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error("Could not encode thumbnail"));
        },
        "image/jpeg",
        0.8,
      );
    });

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Could not load video for thumbnail"));
    });
  });
}
