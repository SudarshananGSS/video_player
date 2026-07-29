export function MediaPlayer({
  type,
  url,
  posterUrl,
  title,
}: {
  type: "video" | "image";
  url: string;
  posterUrl: string | null;
  title: string | null;
}) {
  if (type === "video") {
    return (
      <video
        src={url}
        poster={posterUrl ?? undefined}
        controls
        autoPlay
        className="max-h-[85vh] w-full max-w-4xl rounded-lg"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={title ?? ""} className="max-h-[85vh] w-full max-w-4xl rounded-lg object-contain" />
  );
}
